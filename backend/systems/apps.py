from django.apps import AppConfig


class SystemsConfig(AppConfig):
    name = 'systems'
    label = 'canvases'  # preserves existing DB table names and migration history
