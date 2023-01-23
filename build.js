const mysql = require("mysql");
let config = require("./config.json");
let db = mysql.createConnection(config.db.create_connection);

/**
 * @todo create table for error logging
 */
build()
    .catch(console.log)
    .then((succeed) => db.end());

async function build() {
    let parsed_package_version = process.env.npm_package_version.replaceAll(
        ".",
        "_"
    ); // e.g. 1_0_1
    let db_name = ""; // String (e.g)twitchmon_dev_1_0_1
    let idSet = new Set(); // Set of streamer ids
    let channels = config.channels; // Obj[]

    // set database name, add id to idSet
    if (process.env.NODE_ENV === "development") {
        db_name = `twitchmon_${parsed_package_version}_dev`;
        channels.forEach((channel) => {
            if (channel.deploy === "development")
                channel.idlist.forEach((id) => idSet.add(id));
        });
    } else {
        db_name = `twitchmon_${parsed_package_version}`; // e.g. twitchmon_1_0_0
        channels.forEach((channel) => {
            if (channel.deploy === "production")
                channel.idlist.forEach((id) => idSet.add(id));
        });
    }

    await db_query(`CREATE DATABASE ${db_name}`);
    await db_query(`USE ${db_name}`);
    let promises = [];
    idSet.forEach((id) => {
        promises.push(
            db_query(`
	            CREATE TABLE twitch_${id} (
	            id int(11) NOT NULL AUTO_INCREMENT,
	            created DATETIME(3) DEFAULT NOW(3),
	            data json,
	            PRIMARY KEY (id)
	            );
	        `)
        );
    });
    await Promise.all(promises);
    return "succeed";
}
function db_query(sql) {
    return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => {
            if (err) return reject(err);
            return resolve(res);
        });
    });
}
