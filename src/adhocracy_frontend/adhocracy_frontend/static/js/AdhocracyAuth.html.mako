<script>
(function() {
    "use strict"

    var canonicalOrigin = "${canonical_origin}";

    var http = function(url, cb) {
        var req = new XMLHttpRequest();

        req.onreadystatechange = function(e) {
            if (req.readyState === 4 && req.status < 400) {
                cb(e.target.response);
            }
        }

        req.open('GET', url, true)
        req.send(null);
    };

    var postMessage = function(data) {
        console.log(data);
        window.parent.postMessage(JSON.stringify(data), canonicalOrigin);
    };

    var onMessage = function(name, cb) {
        window.addEventListener("message", function(event) {
            if (event.origin === canonicalOrigin) {
                var message = JSON.parse(event.data);
                if (message.name === name) {
                    cb(message);
                }
            }
        });
    }

    var sendLoginState = function() {
        var sessionValue = localStorage.getItem("user-session");
        if (sessionValue) {
            var session = JSON.parse(sessionValue);
            var path = session["user-path"];

            http(path, function(response) {
                var data = JSON.parse(response);
                var userName = data.data["adhocracy_core.sheets.principal.IUserBasic"].name;

                postMessage({
                    name: "userName",
                    data: userName
                });
            });
        } else {
            postMessage({name: "logout"});
        }
    };

    window.addEventListener("storage", sendLoginState);
    sendLoginState();

    onMessage("logout", function() {
        localStorage.removeItem("user-session");
    });
})();
</script>
