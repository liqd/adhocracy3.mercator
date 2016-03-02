from pytest import fixture
from pytest import mark


class TestPitch:

    @fixture
    def meta(self):
        from .mercator2 import pitch_meta
        return pitch_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.IPitch
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'pitch'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.IPitch,
             adhocracy_core.sheets.description.IDescription,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestPartners:

    @fixture
    def meta(self):
        from .mercator2 import partners_meta
        return partners_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.IPartners
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'partners'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.IPartners,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestDuration:

    @fixture
    def meta(self):
        from .mercator2 import duration_meta
        return duration_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.IDuration
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'duration'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.IDuration,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestChallenge:

    @fixture
    def meta(self):
        from .mercator2 import challenge_meta
        return challenge_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.IChallenge
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'challenge'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.IChallenge,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestGoal:

    @fixture
    def meta(self):
        from .mercator2 import goal_meta
        return goal_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.IGoal
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'goal'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.IGoal,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestPlan:

    @fixture
    def meta(self):
        from .mercator2 import plan_meta
        return plan_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.IPlan
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'plan'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.IPlan,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestTarget:

    @fixture
    def meta(self):
        from .mercator2 import target_meta
        return target_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.ITarget
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'target'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.ITarget,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestTeam:

    @fixture
    def meta(self):
        from .mercator2 import team_meta
        return team_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.ITeam
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'team'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.ITeam,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestExtrainfo:

    @fixture
    def meta(self):
        from .mercator2 import extrainfo_meta
        return extrainfo_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.IExtraInfo
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'extrainfo'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.IExtraInfo,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestConnectionCohesion:

    @fixture
    def meta(self):
        from .mercator2 import connectioncohesion_meta
        return connectioncohesion_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.IConnectionCohesion
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'connectioncohesion'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.IConnectionCohesion,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestDifference:

    @fixture
    def meta(self):
        from .mercator2 import difference_meta
        return difference_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.IDifference
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'difference'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.IDifference,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestPracticalrelevance:

    @fixture
    def meta(self):
        from .mercator2 import practicalrelevance_meta
        return practicalrelevance_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        assert meta.iresource == mercator2.IPracticalRelevance
        assert meta.permission_create == 'edit_proposal'
        assert meta.autonaming_prefix == 'practicalrelevance'
        assert meta.extended_sheets == \
            (adhocracy_mercator.sheets.mercator2.IPracticalRelevance,
             adhocracy_core.sheets.comment.ICommentable,)

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestMercatorProposal:

    @fixture
    def meta(self):
        from .mercator2 import proposal_meta
        return proposal_meta

    def test_meta(self, meta):
        import adhocracy_mercator.sheets.mercator2
        import adhocracy_core.sheets
        from adhocracy_mercator.resources import mercator2
        from adhocracy_core.resources.comment import add_commentsservice
        from adhocracy_core.resources.rate import add_likesservice
        from adhocracy_core.resources.logbook import add_logbook_service
        from adhocracy_core.sheets.badge import IBadgeable
        assert meta.iresource == mercator2.IMercatorProposal
        assert meta.element_types == (mercator2.IPitch,
                                      mercator2.IPartners,
                                      mercator2.IDuration,
                                      mercator2.IChallenge,
                                      mercator2.IGoal,
                                      mercator2.IPlan,
                                      mercator2.ITarget,
                                      mercator2.ITeam,
                                      mercator2.IExtraInfo,
                                      mercator2.IConnectionCohesion,
                                      mercator2.IDifference,
                                      mercator2.IPracticalRelevance,
        )
        assert meta.extended_sheets == \
            (adhocracy_core.sheets.badge.IBadgeable,
             adhocracy_core.sheets.title.ITitle,
             adhocracy_core.sheets.description.IDescription,
             adhocracy_core.sheets.comment.ICommentable,
             adhocracy_core.sheets.rate.ILikeable,
             adhocracy_core.sheets.image.IImageReference,
             adhocracy_mercator.sheets.mercator2.IMercatorSubResources,
             adhocracy_mercator.sheets.mercator2.IUserInfo,
             adhocracy_mercator.sheets.mercator2.IOrganizationInfo,
             adhocracy_mercator.sheets.mercator2.ITopic,
             adhocracy_mercator.sheets.mercator2.ILocation,
             adhocracy_mercator.sheets.mercator2.IStatus,
             adhocracy_mercator.sheets.mercator2.IFinancialPlanning,
             adhocracy_mercator.sheets.mercator2.IExtraFunding,
             adhocracy_mercator.sheets.mercator2.ICommunity,
             adhocracy_mercator.sheets.mercator2.IWinnerInfo)
        assert meta.is_implicit_addable
        assert add_likesservice in meta.after_creation
        assert add_commentsservice in meta.after_creation
        assert add_logbook_service in meta.after_creation

    @mark.usefixtures('integration')
    def test_create(self, pool, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool,
                                      )
        assert meta.iresource.providedBy(res)


class TestProcess:

    @fixture
    def meta(self):
        from .mercator2 import process_meta
        return process_meta

    def test_meta(self, meta):
        import adhocracy_core.resources.process
        from adhocracy_core.resources.asset import add_assets_service
        from .mercator2 import IProcess
        from .mercator2 import IMercatorProposal
        assert meta.iresource is IProcess
        assert IProcess.isOrExtends(adhocracy_core.resources.process.IProcess)
        assert meta.element_types == (IMercatorProposal,)
        assert meta.workflow_name == 'mercator2'

    @mark.usefixtures('integration')
    def test_create(self, registry, meta):
        res = registry.content.create(meta.iresource.__identifier__)
        assert meta.iresource.providedBy(res)
