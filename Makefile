build-app-revira:
	docker build . -t revira-rest-api-image -f Dockerfile.production

run-app-revira:
	docker-compose -f docker-compose-revira.yml up -d

stop-app-revira:
	docker-compose -f docker-compose-revira.yml down