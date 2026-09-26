import os

from dotenv import load_dotenv

load_dotenv()

GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID")
TYPESAFE_API_KEY = os.environ.get("JEVAPIKEY")
GMI_API_KEY = os.environ.get("GMI_API_KEY")
