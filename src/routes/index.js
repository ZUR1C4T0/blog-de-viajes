const { Router } = require("express");
const path = require("path");
const router = Router();

// ruta de inicio
router.get("/", (req, res) => {
  const buscar = req.query.b;
  let pagina = req.query.p ? parseInt(req.query.p) - 1 : 0;
  let busqueda = "";
  let paginado = "";

  if (buscar) {
    busqueda = `WHERE
    titulo LIKE '%${buscar}%' OR
    resumen LIKE '%${buscar}%' `;
  } else {
    if (pagina < 0) pagina = 0;
    paginado = `LIMIT 5 OFFSET ${pagina * 5}`;
  }

  pool.getConnection((err, conn) => {
    try {
      if (err) throw err;

      const query = `
      SELECT publicaciones.id, titulo, resumen, fecha_hora, nombre, votos, avatar
      FROM publicaciones
      INNER JOIN autores
      ON publicaciones.autor_id = autores.id
      ${busqueda}
      ORDER BY fecha_hora DESC
      ${paginado};
    `;

      conn.query(query, (err, result) => {
        if (err) throw err;
        res.render("index", {
          publicaciones: result,
          session: req.session.user,
          buscar,
          pagina: pagina + 1
        });
      });

      conn.release();
    } catch (err) {
      console.log(err);
      res.status(500);
    }
  });
});

// ruta de autores
router.get("/autores", (req, res) => {
  pool.getConnection((err, conn) => {
    try {
      if (err) throw err;

      const getAutores = `SELECT * FROM autores ORDER BY id DESC`;

      conn.query(getAutores, (err, result) => {
        if (err) throw err;

        res.render("autores", { autores: result, session: req.session.user });
      });

      conn.release();
    } catch (err) {
      console.log(err);
      res.status(500);
    }
  });
});

// ruta de registro
router.get("/registro", (req, res) => {
  res.render("registro", { alerta: req.flash("alerta") });
  req.session.destroy();
});

// validación de registro
router.post("/procesar_registro", (req, res) => {
  pool.getConnection((err, conn) => {
    try {
      if (err) throw err;

      const nombre = conn.escape(req.body.nombre.trim().toLowerCase());
      const email = conn.escape(req.body.email.trim().toLowerCase());
      const contrasena = conn.escape(req.body.contrasena);

      const findName = `SELECT * FROM autores WHERE nombre = ${nombre}`;
      const findEmail = `SELECT * FROM autores WHERE email = ${email}`;
      const insertUser = `INSERT INTO autores (nombre, email, contrasena) 
      VALUES (${nombre}, ${email}, ${contrasena})`;

      conn.query(findName, (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
          req.flash(
            "alerta",
            `{
            "text": "Ya existe un autor con ese nombre",
            "color": "warning",
            "icon": "fa-triangle-exclamation"
          }`
          );
          res.redirect("/registro");
        } else {
          conn.query(findEmail, (err, result) => {
            if (err) throw err;

            if (result.length > 0) {
              req.flash(
                "alerta",
                `{
                "text": "Ya existe un autor con este correo",
                "color": "warning",
                "icon": "fa-triangle-exclamation"
              }`
              );
              res.redirect("/registro");
            } else {
              conn.query(insertUser, (err, result) => {
                if (err) throw err;

                if (req.files.avatar && !req.files.avatar.truncated) {
                  const avatar = req.files.avatar;
                  const id = result.insertId;
                  const nombreArchivo = `avatar_${id}${path.extname(avatar.name)}`;

                  avatar.mv(`./public/avatar/${nombreArchivo}`, err => {
                    if (err) throw err;

                    const insertAvatar = `
                    UPDATE autores
                    SET avatar = ${conn.escape(nombreArchivo)}
                    WHERE id = ${conn.escape(id)}`;

                    conn.query(insertAvatar);
                  });
                }

                req.flash(
                  "alerta",
                  `{
                  "text": "Autor registrado! ya puede iniciar sesion.",
                  "color": "success",
                  "icon": "fa-circle-check"
                  }`
                );
                res.redirect("/registro");
              });
            }
          });
        }
      });

      conn.release();
    } catch (err) {
      res.status(500);
      console.log(err);
    }
  });
});

// ruta de ingreso
router.get("/ingreso", (req, res) => {
  res.render("ingreso", { alerta: req.flash("alerta"), pagina: req.query.p });
  if (req.session.user) req.session.destroy();
});

// validación de ingreso
router.post("/procesar_ingreso", (req, res) => {
  pool.getConnection((err, conn) => {
    try {
      if (err) throw err;

      const email = req.body.email.trim().toLowerCase();
      const contrasena = conn.escape(req.body.contrasena);

      const consultarIngreso = `SELECT * FROM autores 
      WHERE email = ${conn.escape(email)} AND contrasena = ${contrasena}`;

      conn.query(consultarIngreso, (err, result) => {
        if (err) throw err;

        const ruta = req.query.p;
        if (result.length > 0) {
          req.session.user = { ...result[0] };
          ruta ? res.redirect("/admin/" + ruta.split("_").join("/")) : res.redirect("/");
        } else {
          req.flash(
            "alerta",
            `{
            "text": "Los datos son inválidos, vuelva a intentar.",
            "color": "danger",
            "icon": "fa-circle-exclamation"}`
          );
          ruta ? res.redirect("/ingreso?p=" + ruta) : res.redirect("/ingreso");
        }
      });

      conn.release();
    } catch (err) {
      console.log(err);
      res.status(500);
    }
  });
});

// validación de cerrar sesión
router.get("/cerrar_sesion", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// rutad de detalles de las publicaciones
router.get("/publicacion/:id", (req, res) => {
  pool.getConnection((err, conn) => {
    try {
      if (err) throw err;

      const id = req.params.id;
      const getDetails = `SELECT * FROM publicaciones WHERE id=${id};`;

      pool.query(getDetails, (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
          res.render("publicacion", {
            publicacion: result[0],
            session: req.session.user,
            alerta: req.flash("alerta")
          });
        } else {
          res.redirect("/");
        }

        conn.release();
      });
    } catch (err) {
      console.log(err);
      res.status(500);
    }
  });
});

// ruta para votar por una publicacion
router.get("/publicacion/:id/votar", (req, res) => {
  pool.getConnection((err, conn) => {
    try {
      if (err) throw err;

      const id = req.params.id;
      const searchPost = `
      SELECT * FROM publicaciones
      WHERE id=${conn.escape(id)};`;

      if (req.session.user) {
        pool.query(searchPost, (err, result) => {
          if (err) throw err;

          if (result.length > 0) {
            const addVoto = `
            UPDATE publicaciones
            SET votos = votos + 1 
            WHERE id = ${conn.escape(id)};`;

            conn.query(addVoto, (err, result) => {
              if (err) throw err;

              res.redirect(`/publicaciones/${conn.escape(id)}`);
            });
          } else {
            req.flash(
              "alerta",
              `{"text": "Acción invalida.",
                "color": "danger",
                "icon": "fa-circle-exclamation"}`
            );
            res.redirect(`/publicacion/${id}`);
          }
        });
      } else {
        req.flash(
          "alerta",
          `{"text": "Tiene que iniciar sesión para votar.",
            "color": "danger",
            "icon": "fa-circle-exclamation"}`
        );
        res.redirect(`/publicacion/${id}`);
      }

      conn.release();
    } catch (err) {
      console.log(err);
      res.status(500);
    }
  });
});

module.exports = router;
