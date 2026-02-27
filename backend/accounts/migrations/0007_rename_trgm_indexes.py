from django.db import migrations


RENAME_FORWARD = """
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'accounts_user_username_trgm_gin_idx')
       AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'acct_usr_un_trgm_gin_idx') THEN
        ALTER INDEX accounts_user_username_trgm_gin_idx RENAME TO acct_usr_un_trgm_gin_idx;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'accounts_user_full_name_trgm_gin_idx')
       AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'acct_usr_fn_trgm_gin_idx') THEN
        ALTER INDEX accounts_user_full_name_trgm_gin_idx RENAME TO acct_usr_fn_trgm_gin_idx;
    END IF;
END
$$;
"""


RENAME_REVERSE = """
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'acct_usr_un_trgm_gin_idx')
       AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'accounts_user_username_trgm_gin_idx') THEN
        ALTER INDEX acct_usr_un_trgm_gin_idx RENAME TO accounts_user_username_trgm_gin_idx;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'acct_usr_fn_trgm_gin_idx')
       AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'accounts_user_full_name_trgm_gin_idx') THEN
        ALTER INDEX acct_usr_fn_trgm_gin_idx RENAME TO accounts_user_full_name_trgm_gin_idx;
    END IF;
END
$$;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_user_accounts_user_username_trgm_gin_idx_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql=RENAME_FORWARD,
            reverse_sql=RENAME_REVERSE,
        ),
    ]
