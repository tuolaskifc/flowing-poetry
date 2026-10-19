// Main entry and experiment share the API and local drawing assets.
import {createPoemServer} from '../../experiments/poem-generation/server.mjs';
const port=Number(process.env.PORT||4173),server=createPoemServer({port});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`流动诗：http://127.0.0.1:${port}`));
