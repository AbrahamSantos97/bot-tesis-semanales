import puppeteer, { Page } from "puppeteer";
import fs from "fs/promises";
import cron from "node-cron";

async function weeklyRoutine(){

    const browser = await createBrowser();

    const page = await gotoInNewPage('https://sjfsemanal.scjn.gob.mx/busqueda-principal-tesis',browser);

    await timer();
    
    await page.click('.btn-primary.btn-search');
    
    await timer();

    const label = await page.evaluate(()=> document.querySelector("#paginationItems").innerText);

    const cadena = label.split(' ');
    
    const total = cadena[cadena.length - 1];

    await page.evaluate(()=>  document.querySelector('#divListResult').firstElementChild.click());

    await timer();

    const arr = await getTesis(total,page);

    await fs.writeFile('nuevas_tesis.json',JSON.stringify(arr),null,3);

    await page.close();

    await browser.close();
}

/**
 * Funcion asincrona que lo que hace es regresar un arreglo de json que contienen las tesis, asi como informacion relevante de la tesis.
 * @param {int} iteraciones - El numero de tesis que debe recorrer, debe ser calculado previamente, no tiene valor por defecto
 * @param {Page} page - Debe enviarse la pagina para poder acceder a los elementos HTML.
 * @returns {Array} -Arreglo de JSON obtenidos de las iteraciones.
 */
async function getTesis(iteraciones,page){
    let arr = [];
    for (let index = 0; index < iteraciones; index++) {
        const element = await page.evaluate(()=> {
            let body = {};
            [...document.querySelectorAll('.Temp')].map(e=> e.innerText).map(e=> e.split(': ')).forEach(elem =>{
                if(elem.length > 1){
                    const key = elem[0].replaceAll(' ','_').replaceAll('(s)','s').toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    body[`${key}`] = elem[1].replaceAll("\\n",'');
                }else{
                    body.epoca = elem[0].replaceAll("\\n",'');
                }
             });
             const rubro = document.querySelector('#divRubro').innerText;
             const contenido = [...document.querySelectorAll('#divTexto > p')].map(cont => cont.innerText);
             const precedente = [...document.querySelectorAll('#divPrecedente > p')].map(cont => cont.innerText);
             const publicacion = document.querySelector('.publicacion').innerText;
             body.rubro = rubro;
             body.contenido = contenido
             body.precedente = precedente;
             body.publicacion = publicacion;
             const nextArrow = document.querySelector('li[ngbtooltip="Registro siguiente"]');
             if(nextArrow && !nextArrow.classList.contains('disabled')){
                nextArrow.firstElementChild.click();
             }
             return body;
        });
        arr.push(element);

        const ahead = await page.evaluate(() => {
            const nextArrow = document.querySelector('li[ngbtooltip="Registro siguiente"]');
            return nextArrow && nextArrow.classList.contains('disabled');
        });
        if(ahead)break;
        await timer(2500);    
    }
    return arr;
}

async function createBrowser(){
    return await puppeteer.launch({headless:'new',slowMo:300});
}

async function gotoInNewPage(url,browser){
    const page = await browser.newPage();
    //Le decimos a donde iremos al navegador, es la vista de todas las tesis
    await page.goto(url);
    //Agrandamos el viewport para que se aprecie bien
    await page.setViewport({width:1920,height:1080});
    //regresamos la pagina
    return page;
}

/**
 * Funcion que se hizo para normalizar la funcion de promesa en el traslado entre paginas, por defecto 3s.
 * @param {int} time 
 */
async function timer(time = 3000){
    await new Promise((resolve) => setTimeout(resolve,time));  
}

weeklyRoutine();
//cron.schedule('59 23 * * */6', () => weeklyRoutine());