This repo is the home of unhosted's remote storage client-side bootstrap script.
Just include the script as shown below in the page of your localStorage-based web app.
It pulls all needed dependencies at runtime using RequireJS.

If you want to install it on your own server you need to adjust the paths and also
install the package "remote-storage" in the same directory.

    <html>
        <head>
            <script src="http://unhosted.org/remoteStorage.js">{
                onChange: function(key, oldValue, newValue) {
                    if(key=='text') {
                        document.getElementById('textfield').value= newValue;
                    }
                },
                category: 'documents'
            }</script>
        </head>
        ...

If you have questions, go to http://webchat.freenode.net/?channels=unhosted and ask. If you don't get
an immediate reply, email support @unhosted.org.
