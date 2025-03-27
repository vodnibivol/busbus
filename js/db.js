import Datastore from '@seald-io/nedb';

const DB = {
  drivers: new Datastore({ filename: 'db/drivers.db', autoload: true, timestampData: true }),
  buses: new Datastore({ filename: 'db/buses.db', autoload: true, timestampData: true }),
  users: new Datastore({ filename: 'db/users.db', autoload: true, timestampData: true }),
};

export default DB;
