Adhocracy received an abuse complaint.

URL: ${url}

Reason given for complaint:
${remark}

% if user_name is None:
The complaint was sent by an anonymous user.
% else:
The complaint was sent by user ${user_name}.

Click here to visit ${user_name}’s profile:
${user_url}
% endif
