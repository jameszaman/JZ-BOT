import praw
import sys

# Connecting to Reddit.
reddit = praw.Reddit(
	client_id=sys.argv[1],
	client_secret=sys.argv[2],
	user_agent=sys.argv[3],
)

# Get the hot posts.
posts = reddit.subreddit(sys.argv[4]).hot(limit=3)
urls = [post.url for post in posts]

# # Get the top posts.
posts = reddit.subreddit(sys.argv[4]).top(limit=3)
for post in posts:
  urls.append(post.url)
print(urls)
