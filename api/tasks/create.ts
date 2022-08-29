import { Octokit, App } from 'octokit';

export default async function handler(request, response) {
  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    await octokit.request(
      `PUT /repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/${request.body.user}`,
      {
        owner: 'OWNER',
        repo: 'REPO',
        path: 'PATH',
        message: 'a new commit message',
        committer: {
          name: process.env.GITHUB_USERNAME,
          email: process.env.GITHUB_USEREMAIL,
        },
        content: request.body.content,
      },
    );
    response.status(200).json({
      body: request.body,
      query: request.query,
      cookies: request.cookies,
    });
  } catch (error) {
    response.status(500).json({
      error: error.message,
    });
  }
}
