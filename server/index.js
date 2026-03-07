const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// In-memory "database"
const users = [
  {
    id: 1,
    email: 'tutor@test.com',
    password: '123',
    userType: 'owner',
    name: 'Tutor Teste'
  },
  {
    id: 2,
    email: 'cuidador@test.com',
    password: '123',
    userType: 'caregiver',
    name: 'Cuidador Teste'
  }
];

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password, userType } = req.body;
  const cleanEmail = email?.trim().toLowerCase();

  console.log(`Tentativa de login: ${cleanEmail} como ${userType}`);

  const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);

  if (!user) {
    console.log('Falha: Usuário ou senha incorretos');
    return res.status(401).json({ message: 'Email ou senha incorretos' });
  }

  if (user.userType !== userType) {
    const typeLabel = user.userType === 'owner' ? 'Tutor' : 'Cuidador';
    const requestedLabel = userType === 'owner' ? 'Tutor' : 'Cuidador';
    console.log(`Falha: Tipo de usuário incorreto. Cadastrado como ${typeLabel}, tentou entrar como ${requestedLabel}`);
    return res.status(401).json({ 
      message: `Este email está cadastrado como ${typeLabel}, não como ${requestedLabel}.` 
    });
  }

  console.log('Login bem-sucedido:', user.name);
  res.json({ 
    message: 'Login realizado com sucesso!',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      userType: user.userType
    }
  });
});

// Register endpoint
app.post('/api/register', (req, res) => {
  const { email, password, userType, name } = req.body;
  const cleanEmail = email?.trim().toLowerCase();

  if (!cleanEmail || !password || !userType) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
  }

  const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existingUser) {
    return res.status(400).json({ message: 'Este email já está cadastrado' });
  }

  const newUser = {
    id: users.length + 1,
    email: cleanEmail,
    password,
    userType,
    name: name || 'Novo Usuário'
  };

  users.push(newUser);
  console.log('Novo usuário registrado:', newUser.email);

  res.status(201).json({ 
    message: 'Cadastro realizado com sucesso!',
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      userType: newUser.userType
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});