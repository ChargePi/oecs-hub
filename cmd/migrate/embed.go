package main

import "embed"

//go:embed ../../deployments/migrations/*.sql
var FS embed.FS
