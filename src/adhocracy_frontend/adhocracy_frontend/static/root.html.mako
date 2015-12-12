<!doctype html>
<html>
    <head>
        <title>Adhocracy</title>
        <meta charset="utf-8">
        % for url in css:
            <link rel="stylesheet" href="${url}"/>
        % endfor
        <base href="/" />
    </head>
    <body>
        <script type="text/javascript" src="http://localhost:6546/js/thentos.js"></script>
        <!--[if gt IE 9]><!-->
        <adh-view></adh-view>
        % for url in js:
            <script type="text/javascript" src="${url}"></script>
        % endfor

        <script type="text/javascript">
            require(["Adhocracy", "text!${config}", "text!${meta_api}"], function(Adh, config_string, meta_api_string) {
                var config = JSON.parse(config_string);
                document.title = config.site_name;
                var meta_api = JSON.parse(meta_api_string);
                $(document).ready(function() {
                    Adh.init(config, meta_api);
                });
            });
        </script>
        <!--<![endif]-->
        <!--[if lt IE 10]>
        <div class="unsupported-browser">
            <img src="/static/icons/png/attention.png"/>
            <div lang="en" class="language-block">
                <h1>Non-supported browser!</h1>
                <p>We're sorry your browser is unsupported. Please either upgrade your Internet Explorer,
                but we recommend
                <a href="http://chromium.woolyss.com/">Chromium</a> or
                <a href="https://www.mozilla.org/en-US/firefox/new/">Firefox</a>.</p>
            </div>
            <img src="/static/icons/png/attention.png"/>
            <div lang="de" class="language-block">
                <h1>Browser wird nicht unterstützt!</h1>
                <p>Es tut uns leid, aber dein Browser wird nicht unterstützt. Bitte aktualisiere die Version deines
                Internet Explorers oder verwende
                <a href="http://chromium.woolyss.com/">Chromium</a> oder
                <a href="https://www.mozilla.org/en-US/firefox/new/">Firefox</a>.</p>
            </div>
        </div>
        <![endif]-->
    </body>
</html>
