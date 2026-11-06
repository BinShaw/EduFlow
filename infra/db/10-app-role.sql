\getenv app_password POSTGRES_APP_PASSWORD
CREATE ROLE eduflow_app LOGIN PASSWORD :'app_password';
