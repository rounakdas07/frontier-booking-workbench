import {mkdir,cp,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/data',{recursive:true});
for(const file of ['index.html','styles.css','app.mjs','core.mjs'])await cp(file,`dist/${file}`);
for(const file of ['booking-data.json','source-records.csv','manifest.json','trust-research.json','company-research.json'])await cp(`data/${file}`,`dist/data/${file}`);
console.log('Static build ready in dist');
