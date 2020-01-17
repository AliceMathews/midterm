const bcrypt = require("bcrypt");

//USERS
//Get a single user from the database given their email
const getUserWithEmail = (db, loginInput) => {
  let queryParams = [loginInput.email];
  let queryString = `
    SELECT *
    FROM users
    WHERE users.email = $1 `;

  return db
    .query(queryString, queryParams)
    .then(res => {
      if (bcrypt.compareSync(loginInput.password, res.rows[0].password)) {
        return res.rows[0];
      } else {
        return ""; //this means they fucked up n pw is wrong
      }
    })
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.getUserWithEmail = getUserWithEmail;

//Get a single user from the database given their id
const getUserWithId = (db, userId) => {
  let queryParams = [userId];
  let queryString = `
    SELECT *
    FROM users
    WHERE users.id = $1; `;
  return db
    .query(queryString, queryParams)
    .then(res => {
      return res.rows[0];
    })
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.getUserWithId = getUserWithId;

//Edit current user profile
const updateUserWithId = (db, newUserParams) => {
  let queryParams = [];
  let queryString = `
    UPDATE users `;

  if (newUserParams.name) {
    queryParams.push(`${newUserParams.name}`);
    queryString += `SET name = $${queryParams.length} `;
  }

  if (newUserParams.email) {
    queryParams.push(`${newUserParams.email}`);

    if (queryParams.length > 1) {
      queryString += `, email = $${queryParams.length} `;
    } else {
      queryString += `SET email = $${queryParams.length} `;
    }
  }

  if (newUserParams.password) {
    queryParams.push(`${bcrypt.hashSync(newUserParams.password, 10)}`);

    if (queryParams.length > 1) {
      queryString += `, password = $${queryParams.length} `;
    } else {
      queryString += `SET password = $${queryParams.length} `;
    }
  }

  if (newUserParams.profile_pic) {
    queryParams.push(`${newUserParams.profile_pic}`);

    if (queryParams.length > 1) {
      queryString += `, profile_pic = $${queryParams.length} `;
    } else {
      queryString += `SET profile_pic = $${queryParams.length} `;
    }
  }

  queryParams.push(newUserParams.userId);
  queryString += `WHERE users.id = $${queryParams.length} RETURNING *`;

  return db
    .query(queryString, queryParams)
    .then(res => {
      return res.rows[0];
    })
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.updateUserWithId = updateUserWithId;

//Add a new user to the database
const addUser = (db, newUserParams) => {
  let queryParams = [
    newUserParams.name,
    newUserParams.email,
    bcrypt.hashSync(newUserParams.password, 10)
  ];
  let queryString = `
      INSERT INTO users `;
  if (newUserParams.profile_pic) {
    queryParams.push(newUserParams.profile_pic);
    queryString += `
      (name, email, password, profile_pic)
      VALUES ($1, $2, $3, $4)
      RETURNING * `;
  } else {
    queryString += `
      (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING * `;
  }

  return db
    .query(queryString, queryParams)
    .then(res => {
      return res.rows[0];
    })
    .catch(err => {
      console.error("query error", error.stack);
    });
};
exports.addUser = addUser;

///RESOURCES
//get all resources depending on the options
const getAllResources = (db, options, limit = 20) => {
  const queryParams = [];
  let queryString = `
    SELECT resources.*, users.name as owner_name, users.profile_pic as owner_profile_pic, categories.thumbnail as category_thumbnail, count(likes.resource_id) as number_of_likes, average_rating
    FROM resources
    LEFT OUTER JOIN likes ON likes.resource_id = resources.id
    LEFT OUTER JOIN users ON resources.owner_id = users.id
    LEFT OUTER JOIN categories ON resources.category_id = categories.id
    LEFT OUTER JOIN (SELECT resource_id, round(avg(rating), 1) as average_rating
                FROM ratings
                GROUP BY resource_id
                ORDER BY resource_id) as average_ratings ON resources.id = average_ratings.resource_id
    WHERE resources.is_active = true
  `;

  if (options.userId) {
    queryParams.push(options.userId);
    queryString += `AND (likes.user_id = $${queryParams.length} OR resources.owner_id = $${queryParams.length}) `;
  }

  if (options.category_id) {
    queryParams.push(`${options.category_id}`);

    queryString += `AND resources.category_id = $${queryParams.length} `;
  }

  if (options.content_type) {
    queryParams.push(`${options.content_type}`);

    queryString += `AND resources.content_type = $${queryParams.length} `;
  }

  if (options.keyword) {
    queryParams.push(`%${options.keyword.toUpperCase()}%`);

    queryString += `AND (upper(resources.title) LIKE $${queryParams.length} OR upper(resources.description) LIKE $${queryParams.length}) `;
  }

  queryString += `
    GROUP BY resources.id, average_ratings.average_rating, users.name, users.profile_pic, categories.thumbnail
  `;

  if (options.rating) {
    queryParams.push(`${options.rating}`);
    queryString += `HAVING average_rating >= $${queryParams.length}`;
  }

  queryParams.push(limit);
  queryString += `
    ORDER BY resources.created_at DESC, number_of_likes DESC, resources.id
    LIMIT $${queryParams.length};
  `;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.getAllResources = getAllResources;

////get resource from resource_id
const getResourceFromId = (db, resource_id) => {
  const queryParams = [resource_id];
  let queryString = `
    SELECT resources.*, resources.created_at at time zone 'utc' at time zone 'pst' as created_at_pst, users.name as owner_name, users.profile_pic as owner_profile_pic, categories.thumbnail as category_thumbnail, count(likes.resource_id) as number_of_likes, average_rating
    FROM resources
    LEFT OUTER JOIN likes ON likes.resource_id = resources.id
    LEFT OUTER JOIN users ON resources.owner_id = users.id
    LEFT OUTER JOIN categories ON resources.category_id = categories.id
    LEFT OUTER JOIN (SELECT resource_id, round(avg(rating), 1) as average_rating
                FROM ratings
                GROUP BY resource_id
                ORDER BY resource_id) as average_ratings ON resources.id = average_ratings.resource_id
    WHERE resources.id = $${queryParams.length}
    GROUP BY resources.id, average_ratings.average_rating, users.name, users.profile_pic, categories.thumbnail;
  `;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.getResourceFromId = getResourceFromId;

//// Add new resource
const addResource = (db, newResourceParams) => {
  const queryParams = [
    newResourceParams.owner_id,
    newResourceParams.category_id,
    newResourceParams.title,
    newResourceParams.url,
    newResourceParams.content_type
  ];
  let queryString = `
    INSERT INTO resources
      (owner_id, category_id, title, url, content_type, description)
    VALUES($1, $2, $3, $4, $5, $6) `;

  if (newResourceParams.description) {
    queryParams.push(newResourceParams.description);
  } else {
    queryParams.push(null);
  }

  queryString += `RETURNING *`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0])
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.addResource = addResource;

//// Delete a resource
const deleteResource = (db, resource_Id) => {
  let queryParams = [resource_Id];
  let queryString = `
    UPDATE resources
    SET is_active = false
    WHERE resources.id = $1
    RETURNING * `;
  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0])
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.deleteResource = deleteResource;

//// Edit an existing resource
const editResource = (db, newResourceParams) => {
  let queryParams = [];
  let queryString = `
    UPDATE resources `;
  if (newResourceParams.category_id) {
    queryParams.push(newResourceParams.category_id);
    queryString += `SET category_id = $${queryParams.length} `;
  }
  if (newResourceParams.title) {
    queryParams.push(`${newResourceParams.title}`);
    if (queryParams.length > 1) {
      queryString += `, title = $${queryParams.length} `;
    } else {
      queryString += `SET title = $${queryParams.length} `;
    }
  }
  if (newResourceParams.description) {
    queryParams.push(`${newResourceParams.description}`);
    if (queryParams.length > 1) {
      queryString += `, description = $${queryParams.length} `;
    } else {
      queryString += `SET description = $${queryParams.length} `;
    }
  }
  if (newResourceParams.url) {
    queryParams.push(`${newResourceParams.url}`);
    if (queryParams.length > 1) {
      queryString += `, url = $${queryParams.length} `;
    } else {
      queryString += `SET url = $${queryParams.length} `;
    }
  }
  queryParams.push(newResourceParams.resource_Id); //expecting a key from the front/route
  queryString += `WHERE resources.id = $${queryParams.length} RETURNING *`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0])
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.editResource = editResource;

const fetchComments = (db, resource_id) => {
  queryParams = [resource_id];
  queryString = `
    SELECT comments.*, comments.created_at at time zone 'utc' at time zone 'pst' as created_at_pst, users.name as user_name, users.profile_pic as user_profile_pic
    FROM comments
    JOIN users on user_id = users.id
    WHERE resource_id = $1
    ORDER BY comments.created_at DESC`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.fetchComments = fetchComments;

//add a new like
const addLike = (db, likeParams) => {
  const queryParams = [likeParams.user_id, likeParams.resource_id];
  let queryString = `
    INSERT INTO likes (user_id, resource_id)
    VALUES ($1, $2)
    RETURNING *
    `;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0].resource_id)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.addLike = addLike;

const countLikes = (db, resource_id) => {
  const queryParams = [resource_id];
  const queryString = `
    SELECT count(likes.resource_id)
    FROM likes
    GROUP BY resource_id
    HAVING resource_id = $1
  `;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.countLikes = countLikes;

const addNewComment = (db, newCommentParams) => {
  queryParams = [
    newCommentParams.user_id,
    newCommentParams.resource_id,
    newCommentParams.message
  ];
  queryString = `
    INSERT INTO comments (user_id, resource_id, message)
    VALUES ($1, $2, $3)
    RETURNING *;`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0].resource_id)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.addNewComment = addNewComment;

const getLikeId = (db, user_id, resource_id) => {
  const queryParams = [user_id, resource_id];
  const queryString = `
    SELECT id
    FROM likes
    WHERE user_id = $1
      AND resource_id = $2;
  `;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0].id)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.getLikeId = getLikeId;

const deleteLike = (db, like_id) => {
  const queryParams = [like_id];
  const queryString = `
    DELETE FROM likes
    WHERE likes.id = $1
    RETURNING *`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0])
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.deleteLike = deleteLike;

const usersLikedResources = (db, user_id) => {
  const queryParams = [user_id];
  const queryString = `
    SELECT resource_id
    FROM likes
    WHERE user_id = $1`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.usersLikedResources = usersLikedResources;

const usersRatedResources = (db, user_id) => {
  const queryParams = [user_id];
  const queryString = `
    SELECT resource_id, rating
    FROM ratings
    WHERE user_id = $1`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.usersRatedResources = usersRatedResources;

const updateRatings = (db, ratingParams) => {
  const queryParams = [
    ratingParams.rating,
    ratingParams.user_id,
    ratingParams.resource_id
  ];
  const queryString = `
    UPDATE ratings
    SET rating = $1
    WHERE user_id = $2 AND resource_id = $3`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.updateRatings = updateRatings;

const addRating = (db, ratingParams) => {
  const queryParams = [
    ratingParams.user_id,
    ratingParams.resource_id,
    ratingParams.rating
  ];
  const queryString = `
    INSERT INTO ratings (user_id, resource_id, rating)
    VALUES ($1, $2, $3)`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.addRating = addRating;

const fetchAverageRating = (db, resource_id) => {
  const queryParams = [resource_id];
  const queryString = `
    SELECT round(AVG(rating),1)
    FROM ratings
    WHERE resource_id = $1
    GROUP BY resource_id`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0])
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.fetchAverageRating = fetchAverageRating;
