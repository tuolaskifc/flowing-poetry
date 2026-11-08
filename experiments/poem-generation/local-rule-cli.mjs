// Prints a self-contained local experiment result. No files or API calls.
import {analyzeLocally} from './local-rule-pipeline.mjs';
try{
 const poem=process.argv.slice(2).join(' ');
 const result=analyzeLocally(poem);
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(!result.validation.valid)process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=1;}
