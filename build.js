const mysql = require("mysql");
let config = require("./config.json");
let db = mysql.createConnection(config.db.create_connection);

/**
 * @todo create table for error logging
 */
build().finally((res) => {
  console.log(`\nBuild Complete`);
  db.end();
});

async function build() {
  let channels = config.channels; // Obj[]
  let parsed_package_version = process.env.npm_package_version.replaceAll(".", "_"); // x_y_z
  let db_name = ""; // String twitchmon_x_y_z or twitchmon_dev_x_y_z
  let idSet = new Set(); // Set[id]
  if (process.env.NODE_ENV === "development") {
    db_name = `twitchmon_${parsed_package_version}_dev`;
    channels.forEach((channel) => {
      if (channel.deploy === "development")
        channel.idlist.forEach((id) => idSet.add(id));
    });
  } else {
    db_name = `twitchmon_${parsed_package_version}`;
    channels.forEach((channel) => {
      if (channel.deploy === "production")
        channel.idlist.forEach((id) => idSet.add(id));
    });
  }

  // CREATE DATABASE
  await db_query(`CREATE DATABASE ${db_name}`)
    .then((res) => console.log(`Ok: CREATED DATABASE ${db_name}`))
    .catch((err) => console.log(`Fail: ${err.code} ${db_name}`));

  // USE DATABASE
  await db_query(`USE ${db_name}`).catch((err) => console.log(err.code));

  // CREATE TABLE
  let promises = [];
  idSet.forEach((id) => {
    promises.push(
      db_query(`
	            CREATE TABLE twitch_${id} (
	            id int(11) NOT NULL AUTO_INCREMENT,
	            created DATETIME(3) DEFAULT NOW(3),
	            data json,
	            PRIMARY KEY (id)
	            );`)
        .then((res) => {
          console.log(`Ok: CREATED TABLE twitch_${id}`);
          return Promise.resolve(res);
        })
        .catch((err) => {
          console.log(`Fail: ${err.code} twich_${id}`);
          return Promise.reject(err);
        })
    );
  });
  return Promise.allSettled(promises);
}
function db_query(sql) {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, res) => {
      if (err) return reject(err);
      return resolve(res);
    });
  });
}
