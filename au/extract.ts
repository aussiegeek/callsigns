import StreamZip from "node-stream-zip";
import Papa from "papaparse";
import fs from "fs";
import { Callsign } from "./types";

const headers = [
  "LICENCE_NO",
  "CLIENT_NO",
  "SV_ID",
  "SS_ID",
  "LICENCE_TYPE_NAME",
  "LICENCE_CATEGORY_NAME",
  "DATE_ISSUED",
  "DATE_OF_EFFECT",
  "DATE_OF_EXPIRY",
  "STATUS",
  "STATUS_TEXT",
  "AP_ID",
  "AP_PRJ_IDENT",
  "SHIP_NAME",
  "BSL_NO",
];

function parseDateString(dateStr: string): string | null {
  if (dateStr === "") return null;
  return dateStr;
}

async function extract() {
  const zip = new StreamZip.async({ file: "spectra_rrl.zip" });

  const licence_by_client: Record<
    string,
    { licence_no: string; client_no: string; category: string }
  > = {};
  const licences: Record<
    string,
    {
      licence_no: string;
      client_no: string;
      category: string;
      date_issued: string | null;
      date_of_effect: string | null;
      date_of_expiry: string | null;
    }
  > = {};

  const clients: Record<
    string,
    {
      name: string;
      suburb: string;
      state: string;
      postcode: string;
    }
  > = {};

  const licenceCSV = await (await zip.entryData("licence.csv")).toString();

  Papa.parse<string[]>(licenceCSV, {
    step: (row) => {
      if (row.data[0] === headers[0]) return;
      if (row.data[2] !== "6") return;
      const client_no = row.data[1];
      const category = row.data[5];
      const licence_no = row.data[0];
      const date_issued = parseDateString(row.data[6]);
      const date_of_effect = parseDateString(row.data[7]);
      const date_of_expiry = parseDateString(row.data[8]);

      const licence = {
        licence_no,
        client_no,
        category,
        date_issued,
        date_of_effect,
        date_of_expiry,
      };

      licence_by_client[client_no] = licence;
      licences[licence_no] = licence;
    },
  });

  const clientCSV = await (await zip.entryData("client.csv")).toString();

  Papa.parse<string[]>(clientCSV, {
    step: (row) => {
      const client_no = row.data[0];
      const licence = licence_by_client[client_no];
      if (!licence) return;

      clients[client_no] = {
        name: row.data[1],
        suburb: row.data[6],
        state: row.data[7],
        postcode: row.data[8],
      };
    },
  });

  const devices: Callsign[] = [];

  const deviceDetailsCSV = await (
    await zip.entryData("device_details.csv")
  ).toString();
  Papa.parse<string[]>(deviceDetailsCSV, {
    step: (row) => {
      const licence_no = row.data[1];
      const licence = licences[licence_no];
      if (!licence) return;
      const client = clients[licence.client_no];

      const callsign = row.data[33];
      if (callsign === "") return;

      devices.push({
        category: licence.category,
        ...client,
        callsign,
        expiryDate: licence.date_of_expiry,
        issuedDate: licence.date_issued,
        effectiveDate: licence.date_of_effect,
      });
    },
  });

  devices.sort((a, b) => {
    if (a.callsign < b.callsign) return -1;
    if (a.callsign > b.callsign) return 1;

    return 0;
  });

  fs.writeFileSync("callsigns.json", JSON.stringify(devices, null, 2));
}

extract();
