require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const mailgun = require('mailgun-js');

const connection = mysql.createConnection(process.env.DATABASE_URL);

app.set('views', path.join(__dirname, 'models'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));

// Configuración de Mailgun
const mailgunConfig = {
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
  from: process.env.MAILGUN_FROM_EMAIL,
};

const mg = mailgun(mailgunConfig);

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/vista', (req, res) => {
  res.render('vista');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { nombre, apellido, gmail, password } = req.body;
  const query = 'INSERT INTO loginregister (nombre, apellido, gmail, password) VALUES (?, ?, ?, ?)';
  connection.query(query, [nombre, apellido, gmail, password], (err, result) => {
    if (err) {
      console.error('Error al registrar usuario:', err);
      res.render('register', { error: 'Error al registrar usuario' });
    } else {
      console.log('Usuario registrado exitosamente');
      // Envío de correo de confirmación
      const mailOptions = {
        from: mailgunConfig.from,
        to: gmail,
        subject: 'Confirmación de registro',
        text: '¡Gracias por registrarte!',
      };

      mg.messages().send(mailOptions, (error, body) => {
        if (error) {
          console.error('Error al enviar el correo de confirmación:', error);
        } else {
          console.log('Correo de confirmación enviado');
        }
      });

      res.redirect('/login');
    }
  });
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { gmail, password } = req.body;
  const query = 'SELECT * FROM loginregister WHERE gmail = ? AND password = ?';
  connection.query(query, [gmail, password], (err, results) => {
    if (err) {
      console.error('Error al autenticar usuario:', err);
      res.render('login', { error: 'Error al autenticar usuario' });
    } else {
      if (results.length === 0) {
        // Credenciales inválidas
        res.render('login', { error: 'Nombre de usuario y / o contraseña no válidos' });
      } else {
        console.log('Usuario autenticado exitosamente');
        res.redirect('/vista');
      }
    }
  });
});

app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { success: null });
});

app.post('/forgot-password', (req, res) => {
  const email = req.body.email;
  console.log(email);

  const mailOptions = {
    from: mailgunConfig.from,
    to: email,
    subject: 'Recuperación de contraseña',
    text: 'Aquí está el enlace para restablecer tu contraseña'
  };

  // Enviar el correo de recuperación de contraseña
  mg.messages().send(mailOptions, (error, body) => {
    if (error) {
      // Ocurrió un error al enviar el correo
      console.error('Error al enviar el correo de recuperación:', error);
      res.render('forgot-password', { error: 'Error al enviar el correo de recuperación' });
    } else {
      // El correo se envió correctamente
      console.log('Correo de recuperación enviado');
      res.render('forgot-password', { success: 'Correo de recuperación enviado correctamente' });
    }
  });
});



app.get('/videos/:videoName', (req, res) => {
  const videoName = req.params.videoName;
  res.sendFile(path.join(__dirname, 'img', 'videos', videoName));
});

connection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
  } else {
    console.log('Conexión exitosa a la base de datos');
    app.listen(3000, () => {
      console.log('Server is running on http://localhost:3000');
    });
  }
});
