const express = require("express");
const session = require("express-session");
const flash = require("express-flash");
const fileUpload = require("express-fileupload");
const path = require("path");
const app = express();

// configuraciones
require("dotenv").config();
global.pool = require("./conexion");

// procesamiento del body
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  fileUpload({
    limits: { fileSize: process.env.MAX_FILE_SIZE * 1024 * 1024 },
    createParentPath: true
  })
);

// variable flash y sesión
app.use(flash());
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: process.env.SECRET_KEY
  })
);

// motor de vistas
app.set("views", path.join(__dirname, "/src/views"));
app.set("view engine", "ejs");

// archivos estaticos
app.use(express.static(path.join(__dirname, "/public")));

// rutas
app.use("/", require("./src/routes/"));
app.use("/admin/publicaciones", require("./src/routes/admin"));

app.listen(process.env.PORT || 3000);
