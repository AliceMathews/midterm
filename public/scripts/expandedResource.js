$(() => {
  const resource_id = window.location.href.split("/").reverse()[0];

  const escape = function(str) {
    let div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  $("#postComment").submit(function(event) {
    event.preventDefault();

    const message = $("#commentText").val();

    $.ajax({
      method: "POST",
      url: `/api/resources/${resource_id}/comments`,
      data: { message, resource_id }
    }).done(commentsArr => {
      $("#commentText").val("");
      renderComments(commentsArr);
    });
  });

  ///helper functions
  const loadComments = function() {
    $.ajax(`/api/resources/${resource_id}/comments`).then(res => {
      renderComments(res);
    });
  };
  loadComments();

  const createCommentElement = function(commentObj) {
    return `
    <article class="comment">
      <header>
        <div class="userIcon">
          <img
            class="user-pic"
            src="${commentObj.user_profile_pic}"
          />
          <span>${commentObj.user_name}</span>
        </div>
      </header>
      <p class="commentContent">${escape(commentObj.message)}</p>
      <footer>
        <span>${commentObj.created_at_pst}</span>
        </span>
      </footer>
    </article>`;
  };

  const renderComments = function(commentsArr) {
    $("#all-comments").empty();
    for (const comment of commentsArr) {
      $("#all-comments").append(createCommentElement(comment));
    }
  };

  $(".fa-star").click(function() {
    const rating = $(this)
      .parent()
      .attr("for")
      .split("-")[1][0];

    $.ajax({
      method: "POST",
      url: `/api/resources/${resource_id}/ratings`,
      data: { rating }
    }).done(averageRating => {
      $(`#avg_rating_of_${resource_id}`).text(
        `Avg. Rating: ${averageRating.round}`
      );
    });
  });
});
