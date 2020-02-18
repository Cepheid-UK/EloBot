// util to return the a list of all the admins from the datbaase table "admins"

exports.getAdmins = async function (database) {

    let admins = []

    let adminResults = await database.query({sql: `SELECT * FROM admins`})

    for (i in adminResults.results) {
        admins.push(adminResults.results[i].discord_id)
    }

    return admins
}