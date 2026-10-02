import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("arrival, home and Mining finish open the official survey",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("img",{name:/Carte géographique/})).toBeVisible();
  await page.getByRole("button",{name:"TOUCHEZ POUR EXPLORER"}).click();
  await expect(page.getByRole("button",{name:/Rencontrer nos experts/})).toBeVisible();
  await page.getByRole("button",{name:/ENTRER DANS L’EXPÉRIENCE MINING/}).click();
  await expect(page.getByRole("heading",{name:"MINING JOURNEY"})).toBeVisible();
  await page.getByRole("button",{name:"Cas Tokadeh"}).click();
  await expect(page.getByRole("heading",{name:"Tokadeh Phase II — Liberia"})).toBeVisible();
  await page.getByRole("button",{name:"Terminer l’expérience",exact:true}).click();
  await expect(page).toHaveURL(/satisfaction$/);
  await expect(page.locator("iframe")).toHaveAttribute("src",/forms\.cloud\.microsoft\/Pages\/ResponsePage/);
  await expect(page.getByRole("link",{name:"Ouvrir en pleine page"})).toHaveAttribute("target","_blank");
});

test("Mining challenge gives feedback and records its result before survey",async({page})=>{
  await page.goto("/mining");await page.getByRole("button",{name:"Relever le défi",exact:true}).click();
  await page.getByRole("button",{name:/A · Étudier la route/}).click();await expect(page.getByText("Bien joué.")).toBeVisible();await page.getByRole("button",{name:/Question suivante/}).click();
  await page.getByRole("button",{name:/B · Fret, douane/}).click();await page.getByRole("button",{name:/Question suivante/}).click();
  await page.getByRole("button",{name:/C · QHSE/}).click();await page.getByRole("button",{name:/Terminer & donner mon avis/}).click();await expect(page.getByText("Score · 3 / 3")).toBeVisible();
});

for(const kind of ["rendez-vous","emploi"]){
  test(`${kind} saves locally and downloads an actual JSON file`,async({page})=>{
    await page.goto(`/${kind}`);await page.getByLabel("Nom et prénom").fill("Visiteur Test");await page.getByLabel("Email",{exact:true}).fill("test@example.com");await page.getByLabel(/Téléphone/).fill("+225 0700000000");await page.getByLabel(kind==="emploi"?"Ville / pays":"Entreprise",{exact:true}).fill("Test CI");if(kind==="rendez-vous")await page.getByLabel("Date souhaitée").fill("2026-12-15");await page.locator('input[name="consent"]').check();
    const dl=page.waitForEvent("download");await page.getByRole("button",{name:/ENREGISTRER & TÉLÉCHARGER/}).click();const file=await dl;const record=JSON.parse(await readFile((await file.path())!,"utf8"));expect(record.fields.email).toBe("test@example.com");expect(record.kind).toBe(kind==="emploi"?"careers":"appointment");expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("agl_requests_v2")??"[]").length)).toBe(1);await expect(page.getByText("Votre dossier est prêt.")).toBeVisible();
  });
}

test("quotation and satisfaction have direct links and QR codes",async({page})=>{
  await page.goto("/cotation");await expect(page.locator("iframe")).toHaveAttribute("src","https://www.aglgroup.com/en/Quotation-form");await expect(page.getByRole("img",{name:"QR code du formulaire"})).toBeVisible();await page.getByRole("button",{name:"Continuer vers l’enquête"}).click();await expect(page).toHaveURL(/satisfaction$/);await expect(page.getByRole("heading",{name:"VOTRE AVIS COMPTE"})).toBeVisible();
});

test("AI streams history and opens a real route sheet",async({page})=>{
  let calls=0;await page.route("**/api/gemini/stream",async route=>{calls++;const body=route.request().postDataJSON();if(calls===2)expect(body.history.length).toBeGreaterThan(0);await route.fulfill({contentType:"text/event-stream",body:'data: {"t":"Voici le corridor."}\n\ndata: {"done":true,"reply":"Voici le corridor.","provider":"gemini","model":"test-model","actions":[{"type":"show_route","route":"route-B"}]}\n\n'});});await page.route("**/api/tts",r=>r.fulfill({status:503,body:"{}"}));
  await page.goto("/accueil");await page.getByRole("button",{name:"Ouvrir AGL AI"}).click();await page.getByLabel("Question à AGL AI").fill("Montre le corridor multimodal");await page.getByRole("button",{name:"Envoyer la question"}).click();await expect(page.getByRole("dialog",{name:/Corridor B/})).toBeVisible();await page.getByRole("button",{name:"Fermer la fiche"}).click();await page.getByLabel("Question à AGL AI").fill("Et pourquoi ce trajet ?");await page.getByRole("button",{name:"Envoyer la question"}).click();await expect.poll(()=>calls).toBe(2);
});

test("camera starts, Live errors gracefully and stop releases the device",async({page,context})=>{
  await context.grantPermissions(["camera","microphone"]);await page.route("**/api/live/token",r=>r.fulfill({status:503,contentType:"application/json",body:JSON.stringify({message:"Conversation Live momentanément indisponible."})}));await page.goto("/vision");await page.getByRole("button",{name:"ACTIVER LA CAMÉRA",exact:true}).click();await expect.poll(()=>page.locator("video").evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);await page.getByRole("button",{name:"ACTIVER LE MICRO & PARLER"}).click();await expect(page.getByText("Conversation Live momentanément indisponible.",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Arrêter la caméra"}).click();await expect(page.getByRole("button",{name:"ACTIVER LA CAMÉRA",exact:true})).toBeVisible();expect(await page.locator("video").evaluate((v:HTMLVideoElement)=>v.srcObject)).toBeNull();
});

test("portrait kiosk remains readable with no horizontal clipping",async({page})=>{
  await page.setViewportSize({width:768,height:1366});await page.goto("/accueil");await expect(page.getByRole("button",{name:/Jouer & explorer/})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.getByRole("button",{name:/Rejoindre l’aventure/}).click();await expect(page.getByRole("heading",{name:"REJOINDRE L’AVENTURE AGL"})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test("screenshots at landscape and portrait sizes",async({page})=>{
  await page.goto("/");await page.waitForTimeout(1000);await page.screenshot({path:"test-results/attract.png"});await page.goto("/accueil");await page.waitForTimeout(1000);await page.screenshot({path:"test-results/home.png"});await page.goto("/mining");await page.waitForTimeout(1000);await page.screenshot({path:"test-results/mining.png"});await page.setViewportSize({width:768,height:1366});await page.goto("/accueil");await page.waitForTimeout(1000);await page.screenshot({path:"test-results/portrait.png"});
});

test("Build remains playable when map tiles are unavailable",async({page})=>{
  await page.route("**://*.basemaps.cartocdn.com/**",route=>route.abort());
  await page.goto("/build");
  const map=page.getByRole("img",{name:"Carte de simulation hors ligne"});
  await expect(map).toBeVisible();
  await map.click({position:{x:150,y:120}});
  await page.getByRole("button",{name:"🚚 LOGISTICS HUB",exact:true}).click();
  await map.click({position:{x:280,y:180}});
  await page.getByRole("button",{name:"⚓ PORT",exact:true}).click();
  await map.click({position:{x:380,y:260}});
  await page.getByRole("button",{name:"⚡ ACTIVER LE CORRIDOR",exact:true}).click();
  await expect(page).toHaveURL(/satisfaction$/,{timeout:15000});
});

test("Mission updates incidents and finishes with the selected reroute",async({page})=>{
  await page.goto("/mission");
  await page.getByRole("button",{name:/ÉQUIPEMENT LOURD/}).click();
  await page.getByRole("button",{name:/COMMENCER LA MISSION/}).click();
  await page.getByRole("button",{name:/Mission A — 80 t/}).click();
  await page.getByRole("button",{name:/VOIR LA CARTE/}).click();
  await page.getByRole("button",{name:"A • Route",exact:true}).click();
  await expect(page.getByRole("button",{name:/SIMULER L.INCIDENT/})).toBeEnabled();
  await expect(page.locator(".incident-zone")).toBeVisible({timeout:15000});
  await page.getByRole("button",{name:/SIMULER L.INCIDENT/}).click();
  await page.getByRole("button",{name:"B Changer de route",exact:true}).click();
  await expect(page.getByRole("heading",{name:"MISSION ACCOMPLIE"})).toBeVisible();
  await expect(page.getByText("Route + Rail + Mer",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:/TERMINER & DONNER MON AVIS/}).click();
  await expect(page).toHaveURL(/satisfaction$/);
});
