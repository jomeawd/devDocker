// Mini serveur Node (sans dépendance) qui sert le site React compilé dans ./dist.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if (path === '/health') return res.end('ok')

  // Refuse les chemins du type /../../etc/passwd qui sortiraient du dossier dist/.
  if (path.includes('..')) return res.writeHead(400).end('Bad request')

  const file = path === '/' ? '/index.html' : path
  try {
    const content = await readFile('dist' + file)
    res.writeHead(200, { 'Content-Type': types[file.slice(file.lastIndexOf('.'))] ?? 'text/plain' })
    res.end(content)
  } catch {
    res.writeHead(404).end('Not found')
  }
})

server.listen(process.env.PORT, () => console.log('front démarré sur le port ' + process.env.PORT))

// docker stop envoie SIGTERM : on ferme le serveur proprement avant de quitter.
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, arrêt du front')
  server.close(() => process.exit(0))
})
