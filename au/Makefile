.PHONY: clean

callsigns.json: spectra_rrl.zip extract.ts
	yarn ts-node au/extract.ts

clean:
	rm -rf *.csv *.TXT *.PDF DOC *.json spectra_rrl.zip

spectra_rrl.zip:
	wget https://web.acma.gov.au/rrl-updates/spectra_rrl.zip