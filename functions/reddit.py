# This is a python code to get reddit posts.
# We use python for this as praw is a lot better than any JS alternatives.
import praw
import sys

# Connecting to Reddit.
reddit = praw.Reddit(
	client_id=sys.argv[1],
	client_secret=sys.argv[2],
	user_agent=sys.argv[3],
)

# Get the hot posts.
posts = reddit.subreddit(sys.argv[4]).hot(limit=5)
urls = [post.url for post in posts]

# Printing the urls so that JavaScript can recieve them.
print(urls)