import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http'
import {
	TDLM_KYRYL_ID, 
	TLDM_PLAYLIST_ID,
	Tracks,
} from '../imports/playlist.js';

const SPOTIFY_CLIENT_ID = Meteor.settings.SPOTIFY_CLIENT_ID;
const SPOTIFY_SECRET_KEY = Meteor.settings.SPOTIFY_SECRET_KEY;

function refreshOauthTokenMaybe() {
	let timeLeft = new Date(Meteor.user().services.spotify.expiresAt - new Date);
	if(timeLeft.getMinutes() < 20) {
		refreshOauthStupidSillyOauth(Meteor.user().services.spotify.refreshToken)
	}
}

function getPlaylist() {
	refreshOauthTokenMaybe()
	return fetch(`https://api.spotify.com/v1/users/${TDLM_KYRYL_ID}/playlists/${TLDM_PLAYLIST_ID}/tracks`, {
		headers: {
			'Authorization': `Bearer ${Meteor.user().services.spotify.accessToken}`
		}
	})
	.then(function(response) {
		return response.json()
	})
}

function playTrack(trackId) {
	refreshOauthTokenMaybe()
	// {"uris":
	// ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh", "spotify:track:1301WleyT98MSxVHPZCA6M"]}
	return fetch(`https://api.spotify.com/v1/me/player/play`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bearer ${Meteor.user().services.spotify.accessToken}`
		},
		body: JSON.stringify({
			uris: [trackId]
		})
	})
	.then(function(response) {
		return response.json()
	})
}

function refreshingOauthFixesError(error) {
	return error == 'The access token expired';
}


function refreshOauthStupidSillyOauth(refresh_token) {
	return new Promise((resolve, reject) => {
		let authThing = new Buffer(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_SECRET_KEY}`).toString('base64');

		HTTP.post("https://accounts.spotify.com/api/token", {
		  params: {
		    grant_type: "refresh_token",
		    refresh_token,
		  },
		  headers: {
		    'Authorization' : "Basic " + authThing,
		    'Content-Type':'application/x-www-form-urlencoded'
		  }
		}, function(error, res) {
			if(error) {
				reject(error)
			}

			let accessToken = res.data.access_token;

			Meteor.users.update({ _id: Meteor.userId() }, {
				$set: {
					'services.spotify.accessToken': accessToken,
				},
				$inc: {
					'services.spotify.expiresAt': +(new Date) + 1000*res.data.expires_in
				}
			})

			resolve(accessToken);
		});
	})
}

Meteor.startup(() => {
	// Tracks.remove({})

	ServiceConfiguration.configurations.update(
	  { "service": "spotify" },
	  {
	    $set: {
	      "clientId": SPOTIFY_CLIENT_ID,
	      "secret": SPOTIFY_SECRET_KEY
	    }
	  },
	  { upsert: true }
	);

	Meteor.publish('playlist-tracks', function() {
		return Tracks.find({ playlist: TLDM_PLAYLIST_ID }, { sort: { votes: -1 } })
	})

	Meteor.methods({
		updatePlaylist: function() {
			let user = Meteor.user();
			if(!user) throw new Error("not logged in");

			getPlaylist().then(playlist => {
				if(playlist.error) {
					throw new Error('my web app works I know, its just the same I know...'+playlist.error.message)
				}

				// Remove tracks removed from playlist
				// console.log(playlist)
				console.log(playlist.images)
				let currentPlaylistTracks = playlist.items.map(item => item.track.id);
				Tracks.remove({
					playlist: TLDM_PLAYLIST_ID, 
					_id: {
						$nin: currentPlaylistTracks
					}
				})

				// Add any new tracks we find
				playlist.items.map(item => {
					Tracks.upsert({ _id: item.track.id }, {
						$set: {
							item,
							playlist: TLDM_PLAYLIST_ID,
						},
						$setOnInsert: {
							votes: 0
						}
					})
				})

			}).catch(err => {
				console.error(err)
			})
		},

		upvote: function(trackId) {
			Tracks.update(trackId, { $inc: { votes: 1 } })
		},

		downvote: function(trackId) {
			Tracks.update(trackId, { $inc: { votes: -1 } })
		},

		playSongOnUsersDevice: function(trackId) {
			playTrack(trackId).then(res => {
				// if(res.error && res.error.status == 401) {
				// 	console.log(res)

				// 	console.log("Refreshing OAuth token", res);
					
				// 	refreshOauthStupidSillyOauth(Meteor.user().services.spotify.refreshToken)
				// 	.then(() => {
				// 		playTrack(trackId).catch(err => {
				// 			console.error(err)
				// 		});
				// 	})
				// 	.catch(err => {
				// 		console.error(res.error)
				// 	});
				// } else {
				// 	throw new Error(res.error.message);
				// }
				throw new Error(res);
			}).catch(err => {
				console.error(err)
			})
		},

		getLatestTrack: function() {
			return Tracks.findOne({ playlist: TLDM_PLAYLIST_ID }, {sort: { $natural : 1 }});
		}
	})

});
