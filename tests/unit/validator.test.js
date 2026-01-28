import { describe, it, expect } from "vitest";
import * as bip39 from "bip39";
import { SeedValidator } from "../../src/utils/validator.js";
describe("Testing seed validation", () => {
    it.each([
        { seed: bip39.generateMnemonic(128), expected: true },
        { seed: bip39.generateMnemonic(160), expected: true },
        { seed: bip39.generateMnemonic(192), expected: true },
        { seed: bip39.generateMnemonic(224), expected: true },
        { seed: bip39.generateMnemonic(256), expected: true },
        { seed: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art", expected: true },
        // Wrong checksum
        { seed: "tuna tiny arrow shadow keep moon meal negative direct stadium task ocean", expected: false },
        // Invalid word
        { seed: "bridge total merit solar adjust duty fiction average find clarify prize cryptooo", expected: false },
        // Missing one word
        { seed: "bridge total merit solar adjust duty fiction average find clarify prize", expected: false },
        // Numbers inside
        { seed: "12345 total 12345 67890 duty 67890 lae45 67890 12345 67890 12345 67890", expected: false },
    ])("Should return $expected for seed: $seed", ({ seed, expected }) => {
        const normalized = SeedValidator.normalizeSeed(seed);
        expect(SeedValidator.validateSeed(normalized)).toBe(expected);
    });
    it("Should validate a seed even with messy formatting", () => {
        const validSeed = "ABANDON abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art ";
        const normalized = SeedValidator.normalizeSeed(validSeed);
        expect(normalized).toBe("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art");
        expect(SeedValidator.validateSeed(normalized)).toBe(true);
    });
});
// {"fragmentB":"fdd863574c371483a3a1e0f702c8c8398fa2682075aaa7d80ee1dbdff8beeac24fe4e87089bee944eb30b017ce2cfe81d13601a7dcb966f174493400427d547c6a396bef90248a1bf93627442b4a4d4cc584d6f88524c6fcf90e93f6036f41889c2d0445b491c921013d3d72fb4f284bfbc0881fbe1db2e893b4d2c54553bfb94bf6b964311d0b4cc2d4edb2bc4a22b8c1d90b9edf65875963db7550c1bdba1714c60ae08125990a81c1d0a9e8a0cbe528cad53e879e66573508dadedd47b49a52debd3214da281532bd9c85cdf0f414c9b2104e36bab1723440a509549a0a9300e1ef7ac203835fddfd2a308e7ab7cf4e7004bcdfe718e9974771423a3113fd7ab6caa64425f503f63023c92e8ae0fca2a4af001238a0a706784e6829b433c53fc67f63b506208d7ca500b798b0aa8960c08c05cc46e60aef604bce969e2a5143d223cdf997da585c8702cfe425479ca900ab0edc44614e41cd91b176ffb60af5054fbf173d774346c741ee341eaf928362e8bf40a2eca51340cc817e2c6202feda266001210287dd73d9daadcb379e3a8632e993a05745b337dd38aa1dab4ad95322687bc715b8d15506003dbe72ee974dec7c2a9cd0d4ece99be3cafaf4a77343844eb107e868a18225a2434d1008fc1818ea8b8b19d948f514597f6a8e4eaeabf4c329619c356bd38c2af7eab6c1b3bb2b98753cc97d8f77a171aac37a33c9f48874eb4c930c1394fd848d8ca78c8d40b5bc84b5e8c4c5d31004d00ee696be52187faa6384faf186c5e21d51c63ba07434b8b55693a1e477240d4f237daf9ccc676edf2a8bb0ffbda00e8602b6532f308587c37df114d71af1e5c7cd3283199050","fragmentC":{"cipherText":"8793ca4b1e256f5a4e5ca6405bb336ff48d8baad644734388c3e9c7d6d6b9e16d7b75c90d19dbbe1777608ebc1132326dc70c827dbc686ab0e5fc49e2f19788e2991419d86265b3fc78fcc60444aebad08d850559cde8f94b8ee48dd48751b5b1468b23afe40e4d9c3088f6531a87ea9e808d7f2c2f60f3ba15a4c397d318dcb15485a94c09cff36b57de6293a67d952ff71aad44be7b1ef4341feecac3094f39fb6ea7b667cde5858b9ac8146cf0ba12e76731903185bfcb8bf3eb8c87b98a91b5a1871f3a4b0b4b37dbd1164a5299e5b0e14d05761a8a200b44a8be6bf555b192b8be7a3c4d51437ba38532cae882a5a816c9662b5e7bf07dd801b9e27db5e856d1d97a29583fd2101dde59e99f3e8545fe97549af8409d8e4412c81ff134710e7b349a9ddf2e2c8b257c32ae8db94b027beb5fd758d5c1ac114e38624e1167cac4ba5c856ad5c444e8e9632b5e7bc757b6c4d343f0f6c6c27b92cad3e5105e38b6d0cd98ffb5f28a65aa2ac74b6d0db86b654efb44d1fd438b5a9533976386e28315e15f3fddeea703416fc3a6310aea94c7a69e3469cff3cd19027a822cff69bfb7e7cd799fa9381f8eb419f619fb3bbd81b801abab292bbedfcf4780f6832797771c7b1473813bcdd963cce302aa92810f4af7d296d8e6d45a83c0d95d1af4aa109b2e933972f1157f51de8d1ed8b007944228d3b9d2687e825cbb426ca7168daa88bc2afc31a5e65a5294eb78488a412c3158d6621696fd1d2866321abe83bb9271c3a9cf30b8eb6a21f7bf6419f6796a0782f5b06554647531adaa9ffbbc743347a0efac397f97112087d2f2080dd174a5aa1a1067c19073283754da4bfad40deec7eb09c8f35040dccd69b08e20f0be5b3e4bc1bdcb3ef011ea3c0a1523dec0db04ce104a6f8b7a926540a183e36cc5073f1eb90e11e4d430edf18e7849955eecb927a3fcae43c5f7890dc64fb72579b98c6aa4603b161c1bf4719e1aebf34d8eae8646cd6a06bdff496d0e53e527af25f8466ff3963184c6aeb44f453d46538ca39349e63307e31e4a55050ff39e88e0e8e1daa4f202e858effed42ca94182a6be5768fdebc5b054f8b6ec166e0b716b37b2703977257b45fe70add846a5ae41522e410be6bf48de2cc107c47b8278370627dec2c9c710e3fbbdd5e8d0b0c8dfe1fa66b915057cf714e8232df77c5af0f92c0d7b2b8306ccfe05e10d893e8a4e221932df9482fab85799c51b16f1da521d3692624edc995d88e3da7603b7f985ef0e258857cffde7e5c03de3d430da7d5a7938009843eef6ea1e257c60297c2bf76d57a795e057a8718f0a7ca248d748864e30aff236faa46c2ada95411d4b3b5ca0677ff5bdbd5abc2ea5edd08119ad4f112cf97dc3d51bdb8a3ea81ee72e34cf3f30ef91d1a65540b25b34c32a776d45859b2685174709688d40ea7f0b9689d087c2127ad6dbb7141ead7fecebf442cce015d10735676d6fbb9818a61ba2d1c04301b6dc4fe0ecde5e75af71644ec7d768256042e30ee75b23c5e2a15e7131221276577d03dee3812ab97ce158def671ede8621ae3fcbd6337ea864989320588873df0fef7976cdd83d095f7358f997524e45a3a0f1e96d46e379c86b69cf3cdfe39d94f82a831aaa5d8110b14f939a143c12f66a914219fa74cc35518f49f44e2114832d9c9a6cad49aa16a9416e4e92c66c93a0944f4b4cfbab8df516faddfa","iv":"5a0a33de46a5093f04324b2047ed22b9","salt":"16a2a51915bae97f5058a0f6a255b076f31b362db5570a6fcc92e4866c353ae160977cb77f2d9b3317e2e74b0ef679fe117bd38a2eb07b466cea33211e3465e0","tag":"6486bfbdb2026adbca037de95b138af5"},"metadata":{"threshold":2,"total":3,"created":"2026-01-28T09:13:22.955Z"}}
