import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const [major,minor,patch]=pkg.version.split('.').map(Number);const code=major*100000+minor*1000+patch;
const xmlPath=join(root,'android/app/src/main/AndroidManifest.xml');let xml=await readFile(xmlPath,'utf8');
for(const permission of ['android.permission.INTERNET','android.permission.CAMERA','android.permission.POST_NOTIFICATIONS']){
 if(!xml.includes(`android:name="${permission}"`))xml=xml.replace(/(<manifest\b[^>]*>)/,`$1\n    <uses-permission android:name="${permission}" />`);
}
if(!xml.includes('android.hardware.camera'))xml=xml.replace(/(<manifest\b[^>]*>)/,'$1\n    <uses-feature android:name="android.hardware.camera" android:required="false" />');
await writeFile(xmlPath,xml);
const gradlePath=join(root,'android/app/build.gradle');let g=await readFile(gradlePath,'utf8');
if(!/\bversionCode\s+\d+/.test(g)||!/\bversionName\s+["'][^"']+["']/.test(g))throw Error('Gradle version not recognized');
g=g.replace(/\bversionCode\s+\d+/,`versionCode ${code}`).replace(/\bversionName\s+["'][^"']+["']/,`versionName "${pkg.version}"`);
const signed=Boolean(process.env.TM_KEYSTORE_FILE&&process.env.TM_STORE_PASSWORD&&process.env.TM_KEY_ALIAS&&process.env.TM_KEY_PASSWORD);
if(signed){
 if(!g.includes('signingConfigs {'))g=g.replace(/\bandroid\s*\{/,`android {\n    signingConfigs {\n        release {\n            storeFile file(System.getenv('TM_KEYSTORE_FILE'))\n            storePassword System.getenv('TM_STORE_PASSWORD')\n            keyAlias System.getenv('TM_KEY_ALIAS')\n            keyPassword System.getenv('TM_KEY_PASSWORD')\n        }\n    }`);
 if(!/buildTypes\s*\{\s*release\s*\{/.test(g))throw Error('release buildTypes missing');
 g=g.replace(/(buildTypes\s*\{\s*release\s*\{)/,'$1\n            signingConfig signingConfigs.release');
}
await writeFile(gradlePath,g);
const source=join(root,'android-icons');const resource=join(root,'android/app/src/main/res');let count=0;
for(const d of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi'])for(const f of ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png']){
 const to=join(resource,`mipmap-${d}`,f);await mkdir(dirname(to),{recursive:true});await copyFile(join(source,`mipmap-${d}`,f),to);count++;
}
if(count!==15)throw Error('Icons incomplete');
const sound=join(resource,'raw','taskmate_alert.wav');await mkdir(dirname(sound),{recursive:true});await copyFile(join(root,'android-sounds/taskmate_alert.wav'),sound);
console.log(`TaskMate version ${pkg.version}, Android ${code}, native icons ${count}, sound copied.`);
