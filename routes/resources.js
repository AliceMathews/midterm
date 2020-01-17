/*
 * All routes for Resources are defined here
 */

const express = require("express");
const router = express.Router();
const databaseFuncs = require("../databaseFuncs");
const auth = require("../middleware/auth");
const userPreferences = require("../middleware/usersPreferences");
const moment = require("moment");

module.exports = db => {
  router.get("/", auth, userPreferences, (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      res.redirect("/api/users/login");
    }

    let options = req.query;

    databaseFuncs.getAllResources(db, options, 60).then(data => {
      const user = res.locals.user;
      res.render("index", { data, user });
      res.status(200);
    });
  });

  router.get("/myResources", auth, userPreferences, (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      res.redirect("/api/users/login");
    }

    let options = {};
    options.userId = userId;

    databaseFuncs.getAllResources(db, options, 60).then(data => {
      const user = res.locals.user;
      const likesArr = [];

      for (const el of data) {
        if (el.owner_id !== user.id) {
          likesArr.push(el);
        }
      }

      res.render("myResources", { data, user, likesArr });
      res.status(200);
    });
  });

  //// Getting to the creation page
  router.get("/new", auth, (req, res) => {
    const user = res.locals.user;
    if (req.session.userId) {
      res.render("newResource", { user });
    } else {
      res.redirect("/api/users/login");
    }
  });

  //// Submit a new resource
  router.post("/new", auth, (req, res) => {
    // if (req.session.userId) then allow else send 403

    const { ...newResourceParams } = req.body;
    newResourceParams.owner_id = req.session.userId;

    databaseFuncs.addResource(db, newResourceParams).then(data => {
      res.redirect("/api/resources");
      res.status(200);
    });
  });

  //// 'Delete' an existing resource
  router.post("/delete/:id", auth, (req, res) => {
    databaseFuncs.deleteResource(db, req.params.id).then(data => {
      res.redirect("/");
      res.status(200);
    });
  });

  router.get("/edit/:id", auth, userPreferences, (req, res) => {
    const resource_id = req.params.id;

    databaseFuncs.getResourceFromId(db, resource_id).then(data => {
      const user = res.locals.user;

      for (resource of data) {
        resource.fromNow = moment(resource.created_at).fromNow();
        resource.created_at_pst = moment(resource.created_at_pst).format(
          "dddd, MMMM Do YYYY, h:mm:ss a"
        );
      }

      res.render("editResource", { data, user });
    });
  });

  //// Edit an existing resource
  router.post("/edit/:id", auth, (req, res) => {
    const { ...newResourceParams } = req.body;
    newResourceParams.resource_Id = req.params.id;
    newResourceParams.owner_id = req.session.userId;
    databaseFuncs.editResource(db, newResourceParams).then(data => {
      res.redirect("/");
      res.status(200);
    });
  });

  // get the expanded resource page
  router.get("/:id", auth, userPreferences, (req, res) => {
    const resource_id = req.params.id;

    databaseFuncs.getResourceFromId(db, resource_id).then(data => {
      const user = res.locals.user;

      for (resource of data) {
        resource.fromNow = moment(resource.created_at).fromNow();
        resource.created_at_pst = moment(resource.created_at_pst).format(
          "dddd, MMMM Do YYYY, h:mm:ss a"
        );
      }

      res.render("expandedResource", { data, user });
    });
  });

  // get the comments for this post
  router.get("/:id/comments", auth, userPreferences, (req, res) => {
    const resource_id = req.params.id;

    databaseFuncs.fetchComments(db, resource_id).then(comments => {
      for (comment of comments) {
        comment.fromNow = moment(resource.created_at).fromNow();
        comment.created_at_pst = moment(comment.created_at_pst).format(
          "dddd, MMMM Do YYYY, h:mm:ss a"
        );
      }
      res.send(comments);
    });
  });

  // posting a new comment to resource
  router.post("/:id/comments", auth, (req, res) => {
    const { ...newCommentParams } = req.body;
    newCommentParams.user_id = res.locals.user.id;

    databaseFuncs.addNewComment(db, newCommentParams).then(resource_id => {
      databaseFuncs.fetchComments(db, resource_id).then(comments => {
        for (comment of comments) {
          comment.fromNow = moment(resource.created_at).fromNow();
          comment.created_at_pst = moment(comment.created_at_pst).format(
            "dddd, MMMM Do YYYY, h:mm:ss a"
          );
        }
        res.send(comments);
      });
    });
  });
  //likes
  router.post("/:id/likes", auth, (req, res) => {
    const likeParams = {};
    likeParams.resource_id = req.params.id;
    likeParams.user_id = res.locals.user.id;

    databaseFuncs
      .addLike(db, likeParams)
      .then(resource_id => {
        return databaseFuncs.countLikes(db, resource_id);
      })
      .then(data => {
        const number_of_likes = data[0].count;
        res.json({ number_of_likes });
      });
  });

  router.post("/:id/likes/delete", auth, (req, res) => {
    const likeParams = {};
    likeParams.resource_id = Number(req.params.id);
    likeParams.user_id = res.locals.user.id;

    databaseFuncs
      .getLikeId(db, likeParams.user_id, likeParams.resource_id)
      .then(like_id => {
        return databaseFuncs.deleteLike(db, like_id);
      })
      .then(data => {
        return databaseFuncs.countLikes(db, data.resource_id);
      })
      .then(data => {
        let number_of_likes;
        if (data.length === 0) {
          number_of_likes = 0;
        } else {
          number_of_likes = data[0].count;
        }
        res.json({ number_of_likes });
      });
  });

  //ratings
  router.post("/:id/ratings", auth, userPreferences, (req, res) => {
    const { ...ratingParams } = req.body;
    ratingParams.resource_id = req.params.id;
    ratingParams.user_id = res.locals.user.id;

    let action = "insert";
    for (el of res.locals.user.ratings) {
      if (el[0] == ratingParams.resource_id) {
        action = "update";
      }
    }

    if (action === "update") {
      databaseFuncs
        .updateRatings(db, ratingParams)
        .then(() => {
          return databaseFuncs.fetchAverageRating(db, ratingParams.resource_id);
        })
        .then(averageRating => {
          res.json(averageRating);
        });
    }

    if (action === "insert") {
      databaseFuncs
        .addRating(db, ratingParams)
        .then(() => {
          return databaseFuncs.fetchAverageRating(db, ratingParams.resource_id);
        })
        .then(averageRating => {
          res.json(averageRating);
        });
    }
  });
  return router;
};
