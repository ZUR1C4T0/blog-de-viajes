const { Router } = require("express");
const router = Router();

// ruta de administración
router.get("/", (req, res) => {
  if (!req.session.user) res.redirect("/ingreso?p=publicaciones");

  pool.getConnection((err, conn) => {
    try {
      if (err) throw err;

      const getPublicaciones = `
      SELECT * FROM publicaciones
      WHERE autor_id = ${req.session.user.id}
      ORDER BY fecha_hora DESC;
      `;

      conn.query(getPublicaciones, (err, result) => {
        if (err) throw err;

        res.render("admin", { session: req.session.user, publicaciones: result });
      });

      conn.release();
    } catch (err) {
      console.log(err);
      res.status(500);
    }
  });
});

// ruta para agregar publicacion
router.get("/agregar", (req, res) => {
  if (!req.session.user) res.redirect("/ingreso?p=publicaciones_agregar");

  res.render("admin.agregar.ejs", { session: req.session.user, alerta: req.flash("alerta") });
});

// validación para agregar publicación
router.post("/procesar_agregar", (req, res) => {
  if (!req.session.user) res.redirect("/ingreso?p=publicaciones_agregar");

  pool.getConnection((err, conn) => {
    try {
      if (err) throw err;

      const autor_id = req.session.user.id;
      const titulo = conn.escape(req.body.titulo);
      const resumen = conn.escape(req.body.resumen);
      const contenido = conn.escape(req.body.contenido);

      if ([titulo, resumen, contenido].some(elem => elem.length === 0)) {
        req.flash(
          "alerta",
          `{
          "text": "Debe llenar todos los campos",
          "color": "danger",
          "icon": "fa-triangle-exclamation"
          }`
        );
        res.redirect("/admin/publicaciones/agregar");
      }

      const insertarPublicacion = `
      INSERT INTO publicaciones (titulo, resumen, contenido, autor_id)
      VALUES (${titulo}, ${resumen}, ${contenido}, ${autor_id})`;

      conn.query(insertarPublicacion, (err, result) => {
        if (err) throw err;
        req.flash(
          "alerta",
          `{
          "text": "Publicación agregada con éxito",
          "color": "success",
          "icon": "fa-circle-check"
          }`
        );
        res.redirect("/admin/publicaciones/agregar");
      });

      conn.release();
    } catch (err) {
      console.log(err);
      res.status(500);
    }
  });
});

// ruta para editar publicación
router.get("/editar/:id", (req, res) => {
  const id = req.params.id;
  if (!req.session.user) return res.redirect("/ingreso?p=publicaciones_editar_" + id);

  pool.getConnection((err, conn) => {
    try {
      if (err) throw err;

      const getAuthorPosts = `SELECT id FROM publicaciones WHERE autor_id=${req.session.user.id}`;
      const getPost = `SELECT * FROM publicaciones WHERE id=${conn.escape(id)}`;

      conn.query(getAuthorPosts, (err, result) => {
        if (err) throw err;

        if (!result.some(elem => elem.id == id)) res.status(404);
        else
          conn.query(getPost, (err, result) => {
            if (err) throw err;

            res.render("admin.editar.ejs", {
              alerta: req.flash("alerta"),
              session: req.session.user,
              publicacion: result[0]
            });
          });
      });

      conn.release();
    } catch (err) {
      console.log(err);
      res.status(500);
    }
  });
});

// validación de edición
router.post("/procesar_editar/:id", (req, res) => {
  const id = req.params.id;
  const autor_id = req.session.user.id;

  if (!req.session.user) return res.redirect("/ingreso?p=publicaciones_editar_" + id);

  pool.getConnection((err, conn) => {
    try {
      if (err) throw err;

      const titulo = conn.escape(req.body.titulo);
      const resumen = conn.escape(req.body.resumen);
      const contenido = conn.escape(req.body.contenido);

      if ([titulo, resumen, contenido].some(elem => elem.length === 0)) {
        req.flash(
          "alerta",
          `{
          "text": "Ningún campo debe estar vacío",
          "color": "danger",
          "icon": "fa-triangle-exclamation"
          }`
        );
        res.redirect("/admin/publicaciones/editar/" + id);
      }

      const actualizar = `
      UPDATE publicaciones
      SET titulo=${titulo}, resumen=${resumen}, contenido=${contenido}
      WHERE id=${conn.escape(id)} AND autor_id=${autor_id};`;

      conn.query(actualizar, (err, result) => {
        if (err) throw err;
        req.flash(
          "alerta",
          `{
          "text": "Publicación actualizada con éxito",
          "color": "success",
          "icon": "fa-circle-check"
          }`
        );
        res.redirect("/admin/publicaciones");
      });

      conn.release();
    } catch (err) {
      console.log(err);
      res.status(500);
    }
  });
});

// ruta para eliminar publicación
router.get("/eliminar/:id", (req, res) => {
  const id = req.params.id;

  if (!req.session.user) return res.redirect("/ingreso?p=publicaciones_eliminar_" + id);

  pool.getConnection((err, conn) => {
    try {
      if (err) throw err;

      const autor_id = req.session.user.id;
      const eliminar = `DELETE FROM publicaciones
      WHERE id=${conn.escape(id)} AND autor_id=${conn.escape(autor_id)};`;

      conn.query(eliminar, (err, result) => {
        if (err) throw err;

        if (result.affectedRows > 0) {
          req.flash(
            "alerta",
            `{
            "text": "Publicación eliminada con éxito",
            "color": "success",
            "icon": "fa-circle-check"
            }`
          );
        } else {
          req.flash(
            "alerta",
            `{
            "text": "La publicación no se pudo eliminar",
            "color": "danger",
            "icon": "fa-triangle-exclamation"
            }`
          );
        }
        res.redirect("/admin/publicaciones");
      });

      conn.release();
    } catch (err) {
      console.log(err);
      res.status(500);
    }
  });
});

module.exports = router;
