from unittest.mock import Mock

from pytest import fixture
from pytest import mark
from pytest import raises


@fixture
def integration(config):
    config.include('pyramid_mailer.testing')
    config.include('pyramid_mako')
    config.include('adhocracy_core.content')
    config.include('adhocracy_core.messaging')


@mark.usefixtures('integration')
class TestSendMail():

    def test_send_mail_successfully(self, registry):
        mailer = registry.messenger._get_mailer()
        assert len(mailer.outbox) == 0
        registry.messenger.send_mail(
              subject='Test mail',
              recipients=['user@example.org'],
              sender='admin@example.com',
              body='Blah!',
              html='<p>Bäh!</p>')
        assert len(mailer.outbox) == 1
        msg = str(mailer.outbox[0].to_message())
        assert 'Test mail' in msg
        assert 'Blah' in msg
        assert 'Content-Type: text/html' in msg

    def test_send_mail_successfully_no_html(self, registry):
        mailer = registry.messenger._get_mailer()
        assert len(mailer.outbox) == 0
        registry.messenger.send_mail(
              subject='Test mail',
              recipients=['user@example.org'],
              sender='admin@example.com',
              body='Blah!')
        assert len(mailer.outbox) == 1
        msg = str(mailer.outbox[0].to_message())
        assert 'Content-Type: text/html' not in msg

    def test_send_mail_successfully_neither_body_nor_html(self, registry):
        mailer = registry.messenger._get_mailer()
        assert len(mailer.outbox) == 0
        with raises(ValueError):
            registry.messenger.send_mail(
                  subject='Test mail',
                  recipients=['user@example.org'],
                  sender='admin@example.com')

    def test_send_mail_no_recipient(self, registry):
        mailer = registry.messenger._get_mailer()
        assert len(mailer.outbox) == 0
        with raises(ValueError):
            registry.messenger.send_mail(
                  subject='Test mail',
                  recipients=None,
                  sender='admin@example.com',
                  body='Blah!',
                  html='<p>Bäh!</p>')


class TestSendMailToQueue():

    def test_send_mail_to_queue(self, config, registry):
        config.include('pyramid_mailer.testing')
        config.include('adhocracy_core.content')
        registry.settings['adhocracy.use_mail_queue'] = 'true'
        config.include('adhocracy_core.messaging')
        assert registry.messenger.use_mail_queue is True
        mailer = registry.messenger._get_mailer()
        registry.messenger.send_mail(
              subject='Test mail',
              recipients=['user@example.org'],
              sender='admin@example.com',
              body='Blah!',
              html='<p>Bäh!</p>')
        assert len(mailer.queue) == 1
        assert len(mailer.outbox) == 0


@mark.usefixtures('integration')
class TestRenderAndSendMail:

    @fixture
    def mock_resource_exists(self, registry):
        from adhocracy_core.messaging import Messenger
        mock_resource_exists = Mock(spec=Messenger._resource_exists)
        registry.messenger._resource_exists = mock_resource_exists
        return mock_resource_exists

    @fixture
    def mock_render(self, registry):
        from adhocracy_core.messaging import Messenger
        mock_render = Mock(spec=Messenger._render)
        registry.messenger._render = mock_render
        return mock_render

    def test_render_and_send_mail_both_templates_exist(self, registry,
                                                       mock_resource_exists,
                                                       mock_render):
        mock_resource_exists.return_value = True
        registry.messenger.render_and_send_mail(
            subject='Test mail',
            recipients=['user@example.org'],
            template_asset_base='adhocracy_core:foo',
            args={'name': 'value'})
        assert mock_resource_exists.call_count == 2
        assert mock_resource_exists.call_args == (
            ('adhocracy_core', 'foo.html.mako'),)
        assert mock_render.call_count == 2
        assert mock_render.call_args == (
            ('adhocracy_core:foo.html.mako', {'name': 'value'}),)

    def test_render_and_send_mail_no_template_exist(self, registry,
                                                    mock_resource_exists,
                                                    mock_render):
        mock_resource_exists.return_value = False
        with raises(ValueError):
            registry.messenger.render_and_send_mail(
                subject='Test mail',
                recipients=['user@example.org'],
                template_asset_base='adhocracy_core:foo',
                args={'name': 'value'})
        assert mock_resource_exists.call_count == 2
        assert not mock_render.called


def _msg_to_str(msg):
    """Convert an email message into a string."""
    # The DummyMailer is too stupid to use a default sender, hence we add
    # one manually, if necessary
    if msg.sender is None:
        msg.sender = 'support@unconfigured.domain'
    msgtext = str(msg.to_message())
    # Undo quoted-printable encoding of spaces for convenient testing
    return msgtext.replace('=20', ' ')

def mock_get_sheet_field(context, sheet, field_name, registry):
    result = getattr(context, field_name)
    return result


@mark.usefixtures('integration')
class TestSendAbuseComplaint():

    def test_send_abuse_complaint_with_user(self, monkeypatch, registry):
        from adhocracy_core import messaging
        from adhocracy_core.resources.principal import IUser
        monkeypatch.setattr(messaging, 'get_sheet_field', mock_get_sheet_field)
        user = Mock(spec=IUser)
        user.name = 'Alex User'
        mailer = registry.messenger._get_mailer()
        assert len(mailer.outbox) == 0
        messenger = registry.messenger
        messenger.abuse_handler_mail = 'abuse_handler@unconfigured.domain'
        url = 'http://localhost/blablah'
        remark = 'Too much blah!'
        messenger.send_abuse_complaint(url=url, remark=remark, user=user)
        assert len(mailer.outbox) == 1
        msgtext = _msg_to_str(mailer.outbox[0])
        assert messenger.abuse_handler_mail in msgtext
        assert url in msgtext
        assert remark in msgtext
        assert 'sent by user Alex User' in msgtext

    def test_send_abuse_complaint_without_user(self, registry):
        mailer = registry.messenger._get_mailer()
        assert len(mailer.outbox) == 0
        messenger = registry.messenger
        messenger.abuse_handler_mail = 'abuse_handler@unconfigured.domain'
        url = 'http://localhost/blablah'
        remark = 'Too much blah!'
        messenger.send_abuse_complaint(url=url, remark=remark, user=None)
        assert len(mailer.outbox) == 1
        msgtext = _msg_to_str(mailer.outbox[0])
        assert 'sent by an anonymous user' in msgtext

@mark.usefixtures('integration')
class TestSendMessageToUser():

    def test_send_message_to_user(self, monkeypatch, registry):
        from adhocracy_core import messaging
        from adhocracy_core.resources.principal import IUser
        recipient = Mock(spec=IUser)
        recipient.email = 'recipient@example.org'
        sender = Mock(spec=IUser)
        sender.name = 'username'
        sender.email = 'sender@example.org'
        sender.name = 'Sandy Sender'
        monkeypatch.setattr(messaging, 'get_sheet_field', mock_get_sheet_field)
        mailer = registry.messenger._get_mailer()
        assert len(mailer.outbox) == 0
        messenger = registry.messenger
        messenger.message_user_subject =\
            '[{site_name}] Message from {sender_name}: {title}'
        messenger.send_message_to_user(
            recipient=recipient,
            title='Important Adhocracy notice',
            text='Surprisingly enough, all is well.',
            from_user=sender)
        assert len(mailer.outbox) == 1
        msgtext = _msg_to_str(mailer.outbox[0])
        assert 'From: sender@example.org' in msgtext
        assert 'Subject: [Adhocracy] Message from Sandy Sender: Important Adhocracy notice' in msgtext
        assert 'To: recipient@example.org' in msgtext
