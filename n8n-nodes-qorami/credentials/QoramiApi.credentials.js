// Qorami API credential: a single workspace API key, sent as the
// `x-qorami-api-key` header on every request. Get one at
// https://qorami.fr/dashboard/ (free test credits, no card).
class QoramiApi {
	constructor() {
		this.name = 'qoramiApi';
		this.displayName = 'Qorami API';
		this.documentationUrl = 'https://qorami.fr/docs';
		this.properties = [
			{
				displayName: 'API Key',
				name: 'apiKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				description: 'Your Qorami workspace API key (dashboard → Démarrer).',
			},
		];
		// Inject the key on every authenticated request.
		this.authenticate = {
			type: 'generic',
			properties: {
				headers: {
					'x-qorami-api-key': '={{$credentials.apiKey}}',
				},
			},
		};
		// "Test" button in the credential UI: a cheap authenticated call.
		this.test = {
			request: {
				baseURL: 'https://qorami.fr',
				url: '/api/usage',
			},
		};
	}
}

module.exports = { QoramiApi };
