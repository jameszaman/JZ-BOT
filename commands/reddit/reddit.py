# This is a python code to get reddit posts.
# We use python for this as praw is a lot better than any JS alternatives.
from threading import Thread

import praw
import sys

reddit = praw.Reddit(
	client_id='xhed9qTI5oo_zw',
	client_secret='bRhleSsCA5qX6QKBjqz8fmtT4pi4VQ',
	user_agent='<shitpost_detector_bot>',
)

def get_subreddit_post(subreddit):
	posts = reddit.subreddit(subreddit).hot(limit=5)
	urls = [post.url for post in posts]
	print(f'"{subreddit}": {urls}')


# for all the subreddits.
subreddit_list = sys.argv[4:]

threads_list = []
for subreddit in subreddit_list:
	threads_list.append(Thread(target=get_subreddit_post, args=(subreddit,)))

for thread in threads_list:
	thread.start()

for thread in threads_list:
	thread.join()


