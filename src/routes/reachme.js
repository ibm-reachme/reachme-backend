
module.exports = function (app) {

    app.get('/sample', function (req, res) {
        console.log("Invoked sample route");
        
        res.send("Response");
    });
};