from unittest.mock import Mock
from pyramid import testing


def test_set_root_acms(monkeypatch):
    from adhocracy_core.resources.root import root_acm
    from .root import s1_acm
    from .subscriber import set_root_acms
    mock_set_acms = Mock()
    monkeypatch.setattr('adhocracy_s1.resources.subscriber'
                        '.set_acms_for_app_root', mock_set_acms)
    event = Mock()
    set_root_acms(event)
    mock_set_acms.assert_called_with(event.app, (s1_acm, root_acm))


