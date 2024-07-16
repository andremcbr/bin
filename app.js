const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const port = 3000;
const binFilePath = 'bins.csv';  // Nome do arquivo CSV com os dados dos BINs
const accessFilePath = 'acessos.txt'; // Nome do arquivo com os tokens permitidos

// Função para carregar tokens permitidos de um arquivo
function loadAllowedTokens(callback) {
  fs.readFile(accessFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Erro ao ler o arquivo de tokens:', err);
      return callback([]);
    }
    const tokens = data.split('\n').map(token => token.trim()).filter(token => token);
    callback(tokens);
  });
}

// Função para ler e procurar o BIN no arquivo CSV
function findBinInCsv(card_bin, callback) {
  const results = [];
  
  fs.createReadStream(binFilePath)
    .pipe(csv({ separator: ';', headers: ['bin', 'issuer', 'network', 'type', 'level', 'bank', 'country', 'url', 'phone'] }))
    .on('data', (data) => {
      if (data.bin === card_bin) {
        results.push(data);
      }
    })
    .on('end', () => {
      callback(results);
    });
}

// Middleware para verificar o token de acesso
function verifyToken(req, res, next) {
  const token = req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso é necessário' });
  }

  loadAllowedTokens((allowedTokens) => {
    if (allowedTokens.includes(token)) {
      next();
    } else {
      res.status(403).json({ error: 'Token de acesso inválido' });
    }
  });
}

// Endpoint para consultar o BIN com verificação de token
app.get('/api/bin', verifyToken, (req, res) => {
  const card_bin = req.query.card_bin;
  
  if (!card_bin) {
    return res.status(400).json({ error: 'Parâmetro card_bin é necessário' });
  }

  findBinInCsv(card_bin, (results) => {
    if (results.length > 0) {
      res.json(results);
    } else {
      res.status(404).json({ error: 'BIN não encontrado' });
    }
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
