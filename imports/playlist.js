import { Mongo } from 'meteor/mongo';


export const TDLM_KYRYL_ID = "1267951881";
export const TLDM_PLAYLIST_ID = "1ERb20B6aNrMp8dws16KP1";

export class Track {
  constructor(doc) {
    _.extend(this, doc);
  }

  getPlaylistRank(playlistId) {
  	Users.find({}, { sort: { createdAt: -1 } });
  }
}

export const Tracks = new Mongo.Collection('tracks', {
  transform: (doc) => new Track(doc)
});
