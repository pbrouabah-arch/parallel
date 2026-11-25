
import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

// Keep the original connection test
resolver.define('getText', () => {
    return 'Hello, world!';
});

// Fetch real Jira issues from the PAR project
resolver.define('getJiraIssues', async () => {
    try {
        const response = await api.asApp().requestJira(
            route`/rest/api/3/search/jql`,
            {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jql: 'project = PAR ORDER BY created DESC',
                    maxResults: 50,
                    fields: [
                        'summary',
                        'status',
                        'assignee',
                        'issuetype',
                        'priority',
                        'created',
                        'updated',
                        'duedate',
                    ],
                }),
            }
        );

        if (!response.ok) {
            const errorDetails = await response.text();

            console.error(
                'Jira API error:',
                response.status,
                errorDetails
            );

            return {
                success: false,
                message: `Jira API returned status ${response.status}`,
            };
        }

        const data = await response.json();

        const issues = (data.issues || []).map((issue) => ({
            id: issue.id,
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status?.name ?? null,
            assignee: issue.fields.assignee?.displayName ?? null,
            issueType: issue.fields.issuetype?.name ?? null,
            priority: issue.fields.priority?.name ?? null,
            created: issue.fields.created,
            updated: issue.fields.updated,
            dueDate: issue.fields.duedate,
        }));

        return {
            success: true,
            total: issues.length,
            issues,
        };
    } catch (error) {
        console.error('getJiraIssues failed:', error);

        return {
            success: false,
            message: 'Unable to retrieve Jira issues.',
        };
    }
});

export const handler = resolver.getDefinitions();
