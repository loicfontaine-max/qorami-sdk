import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// Qorami API credential: a single workspace API key, sent as the
// `x-qorami-api-key` header on every request. Get one (free test credits,
// no card) at https://qorami.fr/dashboard/.
export class QoramiApi implements ICredentialType {
	name = 'qoramiApi';

	displayName = 'Qorami API';

	documentationUrl = 'https://qorami.fr/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Qorami workspace API key. Get one free at https://qorami.fr/dashboard/',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-qorami-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://qorami.fr',
			url: '/api/usage',
		},
	};
}
