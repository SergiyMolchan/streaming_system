// const { v4: uuid } = require('uuid');

const uuid = () => '0';

class roomService {
    constructor() {
        this.roomMap = new Map();
    }

    create(data) {
        this.roomMap.set(uuid(), data)
    }

    add(key, data) {
    }

    remove(id) {}

}

module.exports = new roomService();