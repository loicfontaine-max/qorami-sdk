import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

// Qorami node: before your workflow sends an email, ask Qorami whether it's safe.
// The response carries nextAction.type = send | request_human_confirmation |
// do_not_send, with reasons, an audit trace, and (when relevant) a cleaned
// remediation.safeBody. Branch on it with an IF node downstream.
//
// Exposed as an AI tool (usableAsTool) so an n8n AI Agent can call Qorami before
// sending.
export class Qorami implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Qorami',
		name: 'qorami',
		icon: 'file:qorami.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Check an email before your workflow sends it: send / ask a human / block',
		defaults: { name: 'Qorami' },
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'qoramiApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Verify Email',
						value: 'verifyEmail',
						action: 'Verify an email before sending',
						description: 'Ask Qorami whether this email is safe to send',
					},
				],
				default: 'verifyEmail',
			},
			{
				displayName: 'Recipient',
				name: 'recipient',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'client@example.com',
				description: 'Recipient email address',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Email subject',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				description: 'Full email body to check',
			},
			{
				displayName: 'Policy Profile',
				name: 'policyProfile',
				type: 'options',
				options: [
					{ name: 'General', value: 'general' },
					{ name: 'Legal / Finance', value: 'legal-finance' },
					{ name: 'Sales', value: 'sales' },
					{ name: 'Support', value: 'support' },
				],
				default: 'general',
				description: 'Which risk policy Qorami should apply',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const body = {
					recipient: this.getNodeParameter('recipient', i) as string,
					subject: this.getNodeParameter('subject', i) as string,
					body: this.getNodeParameter('body', i) as string,
					policyProfile: this.getNodeParameter('policyProfile', i) as string,
				};

				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'qoramiApi', {
					method: 'POST',
					url: 'https://qorami.fr/api/verify-email',
					body,
					json: true,
				});

				returnData.push({ json: response, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
