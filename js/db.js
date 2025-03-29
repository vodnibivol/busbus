import Datastore from '@seald-io/nedb';

const DB = {
  drivers: new Datastore({ filename: 'db/drivers.db', autoload: true, timestampData: true }),
  buses: new Datastore({ filename: 'db/buses.db', autoload: true, timestampData: true }),
  users: new Datastore({ filename: 'db/users.db', autoload: true, timestampData: true }),
};

const COMPACTION_TIME = 60 * 1000; // 1 min

DB.drivers.setAutocompactionInterval(COMPACTION_TIME);
DB.buses.setAutocompactionInterval(COMPACTION_TIME);
DB.users.setAutocompactionInterval(COMPACTION_TIME);

export default DB;
