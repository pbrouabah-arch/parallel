
import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

// Keep the original connection test
resolver.define('getText', () => {
    return 'Hello, world!';
});

// Fetch available Jira projects
resolver.define('getJiraProjects', async () => {
    try {
        const response = await api.asApp().requestJira(
            route`/rest/api/3/project/search?maxResults=50&orderBy=name`,
            {
                headers: {
                    Accept: 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorDetails = await response.text();

            console.error(
                'Jira projects API error:',
                response.status,
                errorDetails
            );

            return {
                success: false,
                message: `Jira API returned status ${response.status}`,
            };
        }

        const data = await response.json();

        const projects = (data.values || []).map((project) => ({
            id: project.id,
            key: project.key,
            name: project.name,
            projectTypeKey: project.projectTypeKey ?? null,
        }));

        return {
            success: true,
            total: projects.length,
            projects,
        };
    } catch (error) {
        console.error('getJiraProjects failed:', error);

        return {
            success: false,
            message: 'Unable to retrieve Jira projects.',
        };
    }
});

// Fetch Jira issues for a dynamically selected project
resolver.define('getJiraIssues', async ({ payload }) => {
    try {
        const projectKey = payload?.projectKey?.trim().toUpperCase();

        if (!projectKey || !/^[A-Z][A-Z0-9_]*$/.test(projectKey)) {
            return {
                success: false,
                message: 'A valid projectKey is required.',
            };
        }

        const response = await api.asApp().requestJira(
            route`/rest/api/3/search/jql`,
            {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jql: `project = ${projectKey} ORDER BY created DESC`,
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
                'Jira issues API error:',
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
            projectKey,
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
