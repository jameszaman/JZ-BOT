import praw
import sys


reddit = praw.Reddit(
	client_id=sys.argv[1],
	client_secret=sys.argv[2],
	user_agent=sys.argv[3],
)

posts = reddit.subreddit('memes').hot(limit=10)

for post in posts:
  print(post.url) 
