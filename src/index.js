const path = require('path');
const toArr = require("./utils/utils").toArr;
const log = require("./utils/log");
const file = require("./utils/file");
const store = require("./utils/store");
const domino = require("./utils/domino");

let err, packages, response;

const scan = async (dir) => {
    let packages;

    log.log(`Scanning projects path... `);
    [err, packages] = await toArr(file.devPackages(dir));
    if (err) return log.error(`error reading packages in ${dir}`);
    log.log(`✓`);

    log.log(`Saving configuration... `);
    store.set('packages', packages);
    log.log(`✓`);

    log.log(packages.length + ' packages scanned', true);
}

const yarn = async (dir) => {
    let name, version, cmd;

    log.log(`Reading package name... `);
    [err, response] = await toArr(file.getPackage(dir));
    if (err) return log.error(`error reading package in ${dir}`);
    name = response.name;
    version = response.version;
    cmd = `yarn add ${name}@${version}`;
    log.log(`${name}@${version}`);

    log.log(`Finding relevant packages... `);
    packages = store.get('packages');
    if (packages.length === 0) return log.error('Please run ' + 'domino scan'.bold + ' in your projects directory first');

    const queue = domino.whoNeedsThisPackages(name, packages);
    log.log(`${queue.length} packages`);

    await queue.reduce((output, p) => {
        return domino.installForPath(cmd, p.path);
    }, Promise.resolve(true));
}

const update = async (dir) => {
    let name, version;

    log.log(`Reading package name... `);
    [err, response] = await toArr(file.getPackage(dir));
    if (err) return log.error(`error reading package in ${dir}`);
    name = response.name;
    version = response.version;
    log.log(`${name}@${version}`);

    log.log(`Finding relevant packages... `);
    packages = store.get('packages');
    if (packages.length === 0) return log.error('Please run ' + 'domino scan'.bold + ' in your projects directory first');

    const queue = domino.whoNeedsThisPackages(name, packages);
    log.log(`${queue.length} packages`);

    queue.forEach(p => log.log(p.path, true));

    await queue.reduce((output, p) => {
        return domino.injectForPath(dir, name, version, p.path);
    }, Promise.resolve(true));
}

module.exports = {
    scan,
    update,
    yarn,
}
