#!/bin/sh
grep -o -h "TR__[^\"']*" $(git ls-files | grep '\.\(html\|ts\)$') | sort | uniq
